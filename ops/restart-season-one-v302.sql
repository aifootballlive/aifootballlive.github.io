-- Explicitly requested clean restart: league/match history, scores and old test queues.
-- Keep configuration, authentication, device approvals and gift/request dedup receipts.
do $restart$
declare g public.games%rowtype;old_m jsonb;fresh jsonb;league jsonb;keepers jsonb;teamstats jsonb;pending jsonb;at_ms numeric:=extract(epoch from clock_timestamp())*1000;reset_id text:=gen_random_uuid()::text;rev bigint;
begin
 select * into strict g from public.games where name='AI Football Live' for update;
 old_m:=g.rules->'tiktok_match_v2';rev:=coalesce((old_m->>'revision')::bigint,0)+1;
 select jsonb_object_agg(t,to_jsonb(coalesce((old_m->'initialKeeper'->>t)::numeric,(g.rules->'goalkeeper_initial_by_team'->>t)::numeric,10))) into keepers from unnest(array['A','B','C','D']) t;
 select jsonb_object_agg(t,'{"played":0,"wins":0,"draws":0,"losses":0,"goals":0,"points":0}'::jsonb) into teamstats from unnest(array['A','B','C','D']) t;
 select jsonb_object_agg(t,'{"shots":0,"goals":0,"gifts10":0,"gifts100":0,"gifts":0,"coins":0,"unknown":0}'::jsonb) into pending from unnest(array['A','B','C','D']) t;
 league:=jsonb_build_object('season',1,'plannedRounds',20,'completedRounds',0,'extraRounds',0,'trophies','{"A":0,"B":0,"C":0,"D":0}'::jsonb,'teams',teamstats,'history','[]'::jsonb,'champion',null,'historyBase',jsonb_build_object('completedRounds',0,'teams',teamstats));
 fresh:=jsonb_build_object('version',2,'revision',rev,'clientRevision',rev,'clientBuild',302,'minClientBuild',302,'updatedAt',at_ms,'matchMode','live','practiceMode',false,'savedLiveJobs','[]'::jsonb,'clock',jsonb_build_object('round',1,'matchNumber',1,'startedAt',null,'manualStarted',false,'autoStarted',false,'finishedAt',null,'recordForLeague',false,'durationMs',coalesce((old_m->'timing'->>'normalMinutes')::int,25)*60000),'timing',coalesce(old_m->'timing','{"normalMinutes":25,"overtimeMinutes":5}'::jsonb),'scores','{"A":0,"B":0,"C":0,"D":0}'::jsonb,'keeper',keepers,'initialKeeper',keepers,'jobs','[]'::jsonb,'cue',null,'nextCue',null,'lastResult',null,'accepted',0,'shotSequence',0,'idleEpoch',at_ms,'cooldownUntil',0,'lease',null,'processingPaused',false,'fastShotMode',false);
 fresh:=fresh||jsonb_build_object('league',league,'leagueSeasons',jsonb_build_object('1',league),'leagueArchive','[]'::jsonb,'seasonResetHistory','[]'::jsonb,'matchReports',jsonb_build_object('version',1,'trackingStartedAt',at_ms,'records','[]'::jsonb,'pending',pending),'autoMatches',false,'autoStartV2',false,'autoStartV3',false,'manualMatchStart',true,'autoContinuationPaused',true,'guestTrialEnabled',false,'receipts',coalesce(old_m->'receipts','[]'::jsonb),'commandReceipts',coalesce(old_m->'commandReceipts','[]'::jsonb),'liveReports',coalesce(old_m->'liveReports','{"version":1,"sessions":[],"activeId":null}'::jsonb),'seasonReset',jsonb_build_object('id',reset_id,'at',at_ms,'leagueId','doruk'),'dataReset',jsonb_build_object('id',reset_id,'at',at_ms),'matchSelection',jsonb_build_object('id',reset_id,'at',at_ms,'season',1,'matchNumber',1),'queueEdit',jsonb_build_object('id',reset_id,'kind','reset','teams',array['A','B','C','D']),'queueClearAt',jsonb_build_object('A',at_ms,'B',at_ms,'C',at_ms,'D',at_ms),'likeBonus',coalesce(old_m->'likeBonus','{}'::jsonb)||jsonb_build_object('scope','viewer','viewers','{}'::jsonb,'progress',0,'observed',0,'awarded',0,'enabledAt',at_ms,'resetAt',at_ms));
 perform private.validate_shot_queue(old_m,fresh);
 update public.games set rules=jsonb_set(g.rules,'{tiktok_match_v2}',fresh),started_at=null,ended_at=null where id=g.id;
 delete from public.game_events where game_id=g.id;
 delete from public.pending_shots where game_id=g.id;
 update public.teams set score=0 where game_id=g.id;
 update public.goalkeeper_opponent_state set power=initial_power,morale=100 where game_id=g.id;
end;$restart$;
