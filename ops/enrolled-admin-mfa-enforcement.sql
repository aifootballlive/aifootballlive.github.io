create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create or replace function private.admin_mfa_authorized()
returns boolean language sql stable security definer set search_path=''
as $function$
 select (select auth.uid())='6893f884-6b91-4224-abaa-43f87df0966f'::uuid
 and (
   (select auth.jwt()->>'aal')='aal2'
   or not exists (
    select 1 from auth.mfa_factors f
    where f.user_id=(select auth.uid()) and f.status='verified'
   )
 );
$function$;
revoke all on function private.admin_mfa_authorized() from public,anon;
grant execute on function private.admin_mfa_authorized() to authenticated;
comment on function private.admin_mfa_authorized() is 'Owner-only MFA step-up for enrolled admin. AAL1 remains allowed only until first verified factor; public scoreboard reads unaffected.';
do $policies$
declare tab text;
begin
 foreach tab in array array['games','game_events','gift_events','goalkeeper_opponent_state','goalkeepers','pending_shots','players','teams'] loop
  execute format('create policy admin_mfa_insert on public.%I as restrictive for insert to authenticated with check ((select private.admin_mfa_authorized()))',tab);
  execute format('create policy admin_mfa_update on public.%I as restrictive for update to authenticated using ((select private.admin_mfa_authorized())) with check ((select private.admin_mfa_authorized()))',tab);
  execute format('create policy admin_mfa_delete on public.%I as restrictive for delete to authenticated using ((select private.admin_mfa_authorized()))',tab);
 end loop;
end;
$policies$;