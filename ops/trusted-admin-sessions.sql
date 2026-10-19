-- Approved browser sessions, not hardware fingerprinting. No production session is
-- automatically approved. Owner explicitly bootstraps PC, then approves phone.
create table private.admin_device_config(singleton boolean primary key default true check(singleton), enabled boolean not null default false);
insert into private.admin_device_config values(true,false) on conflict do nothing;
create table private.admin_devices(
 session_id uuid primary key references auth.sessions(id) on delete cascade,
 label text not null check(length(label) between 1 and 40),
 requested_at timestamptz not null default now(),
 approved_at timestamptz, revoked_at timestamptz
);
alter table private.admin_device_config enable row level security;
alter table private.admin_devices enable row level security;
revoke all on private.admin_device_config,private.admin_devices from public,anon,authenticated;

create function private.admin_session_identity() returns uuid
language plpgsql stable security definer set search_path='' as $fn$
declare sid uuid;
begin
 if auth.uid() is distinct from '6893f884-6b91-4224-abaa-43f87df0966f'::uuid or auth.jwt()->>'aal' is distinct from 'aal2' then return null;end if;
 sid:=nullif(auth.jwt()->>'session_id','')::uuid;
 if exists(select 1 from auth.sessions s where s.id=sid and s.user_id=auth.uid()) then return sid;end if;
 return null;
end;$fn$;

create function private.admin_session_approved() returns boolean
language sql stable security definer set search_path='' as $fn$
 select private.admin_session_identity() is not null and exists(
 select 1 from private.admin_devices d where d.session_id=private.admin_session_identity() and d.approved_at is not null and d.revoked_at is null);
$fn$;

create function private.admin_device_status() returns jsonb
language plpgsql stable security definer set search_path='' as $fn$
declare sid uuid:=private.admin_session_identity(); active boolean;
begin
 if sid is null then raise exception using errcode='42501',message='Owner MFA session required';end if;
 select enabled into active from private.admin_device_config where singleton;
 return jsonb_build_object('enabled',active,'approved',private.admin_session_approved(),
 'current',(select jsonb_build_object('id',d.session_id,'label',d.label,'approved',d.approved_at is not null and d.revoked_at is null,'revoked',d.revoked_at is not null) from private.admin_devices d where d.session_id=sid),
 'devices',case when private.admin_session_approved() then (select coalesce(jsonb_agg(jsonb_build_object('id',d.session_id,'label',d.label,'approved',d.approved_at is not null,'current',d.session_id=sid,'code',upper(right(replace(d.session_id::text,'-',''),8))) order by d.requested_at),'[]') from private.admin_devices d where d.revoked_at is null and (d.approved_at is not null or d.requested_at>now()-interval '15 minutes')) else '[]'::jsonb end,
 'code',upper(right(replace(sid::text,'-',''),8)));
end;$fn$;

create function private.admin_device_request(device_label text) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare sid uuid:=private.admin_session_identity();
begin
 if sid is null then raise exception using errcode='42501',message='Owner MFA session required';end if;
 perform pg_advisory_xact_lock(204205);
 if length(trim(device_label)) not between 1 and 40 then raise exception 'Invalid device label';end if;
 if exists(select 1 from private.admin_devices where session_id=sid and revoked_at is not null) then raise exception using errcode='42501',message='Revoked session; sign in again';end if;
 if not exists(select 1 from private.admin_devices where session_id=sid) and (select count(*) from private.admin_devices where approved_at is null and revoked_at is null and requested_at>now()-interval '15 minutes')>=8 then raise exception 'Too many pending requests';end if;
 insert into private.admin_devices(session_id,label) values(sid,trim(device_label)) on conflict(session_id) do update set label=excluded.label,requested_at=now();
 return private.admin_device_status();
end;$fn$;

create function private.admin_device_bootstrap(device_label text) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare sid uuid:=private.admin_session_identity();
begin
 if sid is null then raise exception using errcode='42501',message='Owner MFA session required';end if;
 perform pg_advisory_xact_lock(204205);
 if (select enabled from private.admin_device_config where singleton) then raise exception using errcode='42501',message='Already configured; use an approved browser';end if;
 perform private.admin_device_request(device_label);
 update private.admin_devices set approved_at=now() where session_id=sid;
 update private.admin_device_config set enabled=true where singleton;
 return private.admin_device_status();
end;$fn$;

create function private.admin_device_approve(target_session uuid) returns jsonb
language plpgsql security definer set search_path='' as $fn$
begin
 perform pg_advisory_xact_lock(204205);
 if not private.admin_session_approved() then raise exception using errcode='42501',message='Approved owner browser required';end if;
 if exists(select 1 from private.admin_devices where session_id=target_session and approved_at is not null and revoked_at is null) then return private.admin_device_status();end if;
 if (select count(*) from private.admin_devices where approved_at is not null and revoked_at is null)>=2 then raise exception 'Only two approved browsers allowed';end if;
 update private.admin_devices set approved_at=now() where session_id=target_session and approved_at is null and revoked_at is null and requested_at>now()-interval '15 minutes';
 if not found then raise exception 'Request expired or missing';end if;
 return private.admin_device_status();
end;$fn$;

create function private.admin_device_revoke(target_session uuid) returns jsonb
language plpgsql security definer set search_path='' as $fn$
begin
 perform pg_advisory_xact_lock(204205);
 if not private.admin_session_approved() or target_session=private.admin_session_identity() then raise exception using errcode='42501',message='Use the other approved browser';end if;
 update private.admin_devices set revoked_at=now() where session_id=target_session;
 return private.admin_device_status();
end;$fn$;

create function private.admin_device_write_authorized() returns boolean
language sql stable security definer set search_path='' as $fn$
 select private.admin_session_identity() is not null and
 (not (select enabled from private.admin_device_config where singleton) or private.admin_session_approved());
$fn$;
revoke all on function private.admin_session_identity(),private.admin_session_approved(),private.admin_device_write_authorized(),private.admin_device_status(),private.admin_device_request(text),private.admin_device_bootstrap(text),private.admin_device_approve(uuid),private.admin_device_revoke(uuid) from public,anon;
grant execute on function private.admin_session_identity(),private.admin_session_approved(),private.admin_device_write_authorized(),private.admin_device_status(),private.admin_device_request(text),private.admin_device_bootstrap(text),private.admin_device_approve(uuid),private.admin_device_revoke(uuid) to authenticated;
do $policies$
declare tab text;
begin
 foreach tab in array array['games','game_events','gift_events','goalkeeper_opponent_state','goalkeepers','pending_shots','players','teams'] loop
 execute format('create policy approved_browser_insert on public.%I as restrictive for insert to authenticated with check ((select private.admin_device_write_authorized()))',tab);
 execute format('create policy approved_browser_update on public.%I as restrictive for update to authenticated using ((select private.admin_device_write_authorized())) with check ((select private.admin_device_write_authorized()))',tab);
 execute format('create policy approved_browser_delete on public.%I as restrictive for delete to authenticated using ((select private.admin_device_write_authorized()))',tab);
 end loop;
end;$policies$;


create function public.admin_device_status() returns jsonb language sql security invoker set search_path='' as $$select private.admin_device_status()$$;
create function public.admin_device_request(device_label text) returns jsonb language sql security invoker set search_path='' as $$select private.admin_device_request(device_label)$$;
create function public.admin_device_bootstrap(device_label text) returns jsonb language sql security invoker set search_path='' as $$select private.admin_device_bootstrap(device_label)$$;
create function public.admin_device_approve(target_session uuid) returns jsonb language sql security invoker set search_path='' as $$select private.admin_device_approve(target_session)$$;
create function public.admin_device_revoke(target_session uuid) returns jsonb language sql security invoker set search_path='' as $$select private.admin_device_revoke(target_session)$$;
revoke all on function public.admin_device_status(),public.admin_device_request(text),public.admin_device_bootstrap(text),public.admin_device_approve(uuid),public.admin_device_revoke(uuid) from public,anon;
grant execute on function public.admin_device_status(),public.admin_device_request(text),public.admin_device_bootstrap(text),public.admin_device_approve(uuid),public.admin_device_revoke(uuid) to authenticated;
create policy deny_direct_device_config on private.admin_device_config to authenticated using(false) with check(false);
create policy deny_direct_device_rows on private.admin_devices to authenticated using(false) with check(false);
