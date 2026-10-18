-- Correctness guard for accidental or stale-client queue loss. Existing RLS still governs authorization.
create or replace function private.shot_complete(m jsonb,c jsonb,legacy boolean default false)
returns boolean language sql immutable security invoker set search_path='' as $fn$
 select coalesce((c->>'videoStartedAt')::numeric >= (c->>'startsAt')::numeric
 and (c->>'startsAt')::numeric >= (m->'clock'->>'startedAt')::numeric
 and ((m->'clock'->>'manualStarted')::boolean is true or (m->'clock'->>'autoStarted')::boolean is true)
 and (c->>'videoFinishedAt')::numeric >= (c->>'videoStartedAt')::numeric
 and ((legacy and coalesce((c->>'playbackProtocol')::int,0)<>204 and c->>'finishedAt' is not null and (c->>'committed')::boolean is true)
 or ((c->>'playbackProtocol')::int=204 and c->>'videoPlaybackOwner'=c->>'playbackOwner'
 and (c->>'videoPlayedSeconds')::numeric >= (c->>'durationMs')::numeric/1000-.35
 and (c->>'videoElapsedMs')::numeric >= (c->>'durationMs')::numeric-500)),false);
$fn$;
create or replace function private.shot_pending(m jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $fn$
declare counts jsonb:='{"A":0,"B":0,"C":0,"D":0}';j jsonb;t text;n numeric;
begin
 for j in select value from jsonb_array_elements(coalesce(m->'jobs','[]')) loop
  t:=j->>'team';if counts ? t then n:=greatest(1,coalesce((j->>'count')::numeric,1));counts:=jsonb_set(counts,array[t],to_jsonb((counts->>t)::numeric+n));end if;
 end loop;
 for j in select value from jsonb_array_elements(jsonb_build_array(m->'cue',m->'nextCue')) loop
  t:=j->>'team';if counts ? t and not private.shot_complete(m,j,true) then counts:=jsonb_set(counts,array[t],to_jsonb((counts->>t)::numeric+1));end if;
 end loop;return counts;
end;$fn$;
create or replace function private.validate_shot_queue(old_m jsonb,new_m jsonb)
returns void language plpgsql security invoker set search_path='' as $fn$
declare before_counts jsonb:=private.shot_pending(old_m);after_counts jsonb:=private.shot_pending(new_m);t text;c jsonb;prior jsonb;spent integer;edit boolean;
begin
 foreach t in array array['A','B','C','D'] loop
  if (after_counts->>t)::numeric >= (before_counts->>t)::numeric then continue;end if;
  edit:=coalesce(new_m->'queueEdit'->>'id','')<>coalesce(old_m->'queueEdit'->>'id','') and new_m->'queueEdit'->>'id' is not null
   and ((new_m->'queueEdit'->>'kind'='reset') or (new_m->'queueEdit'->>'kind'='resize' and (new_m->'queueEdit'->'teams') ? t));
  if coalesce(edit,false) then continue;end if;
  spent:=0;
  for c in select value from jsonb_array_elements(jsonb_build_array(new_m->'cue',new_m->'nextCue')) loop
   if c->>'team'<>t or not private.shot_complete(new_m,c,false) then continue;end if;
   for prior in select value from jsonb_array_elements(jsonb_build_array(old_m->'cue',old_m->'nextCue')) loop
    if prior->>'id'=c->>'id' and prior->>'startsAt'=c->>'startsAt' and not private.shot_complete(old_m,prior,true) then spent:=spent+1;end if;
   end loop;
  end loop;
  if (before_counts->>t)::numeric-(after_counts->>t)::numeric > spent then raise exception using errcode='23514',message='SHOT_QUEUE_INTEGRITY: unplayed shots cannot be removed; refresh the admin page';end if;
 end loop;
end;$fn$;
create or replace function private.guard_shot_queue()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
 if auth.uid()='6893f884-6b91-4224-abaa-43f87df0966f'::uuid and jsonb_build_array(old.rules->'tiktok_match_v2'->'jobs',old.rules->'tiktok_match_v2'->'cue',old.rules->'tiktok_match_v2'->'nextCue',old.rules->'tiktok_match_v2'->'clock') is distinct from jsonb_build_array(new.rules->'tiktok_match_v2'->'jobs',new.rules->'tiktok_match_v2'->'cue',new.rules->'tiktok_match_v2'->'nextCue',new.rules->'tiktok_match_v2'->'clock') then
  perform private.validate_shot_queue(old.rules->'tiktok_match_v2',new.rules->'tiktok_match_v2');
 end if;return new;
end;$fn$;
revoke all on function private.shot_complete(jsonb,jsonb,boolean),private.shot_pending(jsonb),private.validate_shot_queue(jsonb,jsonb),private.guard_shot_queue() from public,anon;
grant execute on function private.shot_complete(jsonb,jsonb,boolean),private.shot_pending(jsonb),private.validate_shot_queue(jsonb,jsonb),private.guard_shot_queue() to authenticated;
-- Activate only after compatible frontend publication:
-- create trigger preserve_unplayed_shots before update of rules on public.games for each row execute function private.guard_shot_queue();
