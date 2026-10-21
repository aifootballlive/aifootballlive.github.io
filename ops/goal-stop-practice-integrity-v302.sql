-- Existing full-video completion proof is unchanged. This helper only validates a persisted goal.
create or replace function private.shot_goal_proven(m jsonb,c jsonb)
returns boolean language sql immutable security invoker set search_path='' as $fn$
 select coalesce(c->>'result'='goal' and (c->>'committed')::boolean is true
 and (c->>'playbackProtocol')::int=204
 and (c->>'videoStartedAt')::numeric >= (c->>'startsAt')::numeric
 and (c->>'startsAt')::numeric >= (m->'clock'->>'startedAt')::numeric
 and ((m->'clock'->>'manualStarted')::boolean is true or (m->'clock'->>'autoStarted')::boolean is true)
 and c->>'goalPlaybackOwner'=c->>'playbackOwner'
 and (c->>'goalAt')::numeric >= (c->>'videoStartedAt')::numeric
 and coalesce((c->>'goalMediaSeconds')::numeric,case c->>'team' when 'A' then 3.4 when 'B' then 3.8 when 'C' then 4 when 'D' then 3.35 end) between .2 and (c->>'durationMs')::numeric/1000
 and (c->>'goalMediaTime')::numeric >= coalesce((c->>'goalMediaSeconds')::numeric,case c->>'team' when 'A' then 3.4 when 'B' then 3.8 when 'C' then 4 when 'D' then 3.35 end)
 and (c->>'goalPlayedSeconds')::numeric >= coalesce((c->>'goalMediaSeconds')::numeric,case c->>'team' when 'A' then 3.4 when 'B' then 3.8 when 'C' then 4 when 'D' then 3.35 end)-.35
 and (c->>'goalElapsedMs')::numeric >= coalesce((c->>'goalMediaSeconds')::numeric,case c->>'team' when 'A' then 3.4 when 'B' then 3.8 when 'C' then 4 when 'D' then 3.35 end)*1000-500,false);
$fn$;
create or replace function private.shot_pending(m jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $fn$
declare counts jsonb:='{"A":0,"B":0,"C":0,"D":0}';j jsonb;t text;n numeric;
begin
 for j in select value from jsonb_array_elements(case when (m->>'practiceMode')::boolean is true then coalesce(m->'savedLiveJobs','[]') else coalesce(m->'jobs','[]') end) loop
  t:=j->>'team';if counts ? t then n:=greatest(1,coalesce((j->>'count')::numeric,1));counts:=jsonb_set(counts,array[t],to_jsonb((counts->>t)::numeric+n));end if;
 end loop;
 if (m->>'practiceMode')::boolean is true then return counts;end if;
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
  -- A goal already proven at its native frame remains scored when its unfinished
  -- return walk is retired on stop, reconnect or transfer. Credit that exact cue once.
  if coalesce((old_m->>'practiceMode')::boolean,false)=false then
   for prior in select value from jsonb_array_elements(jsonb_build_array(old_m->'cue',old_m->'nextCue')) loop
    if prior->>'team'=t and not private.shot_complete(old_m,prior,true) and private.shot_goal_proven(old_m,prior)
     and coalesce((new_m->'scores'->>t)::numeric,0)>=coalesce((old_m->'scores'->>t)::numeric,0)
     and not exists(select 1 from jsonb_array_elements(jsonb_build_array(new_m->'cue',new_m->'nextCue')) x where x->>'id'=prior->>'id' and x->>'startsAt'=prior->>'startsAt')
    then spent:=spent+1;end if;
   end loop;
  end if;
  if (before_counts->>t)::numeric-(after_counts->>t)::numeric > spent then raise exception using errcode='23514',message='SHOT_QUEUE_INTEGRITY: unplayed shots cannot be removed; refresh the admin page';end if;
 end loop;
end;$fn$;

revoke all on function private.shot_goal_proven(jsonb,jsonb) from public,anon;
grant execute on function private.shot_goal_proven(jsonb,jsonb) to authenticated;
