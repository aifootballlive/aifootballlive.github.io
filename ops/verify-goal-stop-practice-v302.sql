do $test$
declare m jsonb;n jsonb;p jsonb;blocked boolean:=false;
begin
 m:='{"version":2,"clock":{"startedAt":1000,"manualStarted":true},"scores":{"A":1,"B":0,"C":0,"D":0},"jobs":[{"id":"paid","team":"A","count":2}],"cue":{"id":"goal","team":"A","result":"goal","committed":true,"playbackProtocol":204,"startsAt":1000,"videoStartedAt":1020,"durationMs":4000,"playbackOwner":"owner","goalPlaybackOwner":"owner","goalAt":3500,"goalMediaSeconds":2.333333,"goalMediaTime":2.375,"goalPlayedSeconds":2.35,"goalElapsedMs":2376}}'::jsonb;
 if not private.shot_goal_proven(m,m->'cue') or private.shot_complete(m,m->'cue',true) then raise exception 'goal-only proof fixture failed';end if;
 n:=jsonb_set(jsonb_set(m,'{cue}','null'::jsonb),'{clock,finishedAt}','5000'::jsonb);perform private.validate_shot_queue(m,n);
 begin perform private.validate_shot_queue(m,jsonb_set(n,'{jobs}','[]'::jsonb));exception when check_violation then blocked:=true;end;if not blocked then raise exception 'real unplayed jobs were allowed to disappear';end if;
 blocked:=false;p:=jsonb_set(m,'{cue,goalPlayedSeconds}','0'::jsonb);begin perform private.validate_shot_queue(p,n);exception when check_violation then blocked:=true;end;if not blocked then raise exception 'unproven goal was accepted';end if;
 p:=n||jsonb_build_object('practiceMode',true,'savedLiveJobs',n->'jobs','jobs','[{"team":"B","count":100}]'::jsonb);perform private.validate_shot_queue(n,p);if private.shot_pending(p)<>'{"A":2,"B":0,"C":0,"D":0}'::jsonb then raise exception 'practice jobs counted as paid';end if;perform private.validate_shot_queue(p,n);
 blocked:=false;begin perform private.validate_shot_queue(p,jsonb_set(p,'{savedLiveJobs}','[]'::jsonb));exception when check_violation then blocked:=true;end;if not blocked then raise exception 'protected saved real jobs were allowed to disappear';end if;
end;$test$;
