-- READ ONLY. Run in the project SQL editor before preparing a restrictive migration.
-- This file does not change policies, tables, accounts, sessions or match state.
select n.nspname as schema, c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by c.relname;
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname='public' order by tablename,policyname;
select grantee,table_name,privilege_type from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated','PUBLIC') order by table_name,grantee,privilege_type;
select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,p.proconfig,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by p.proname;
