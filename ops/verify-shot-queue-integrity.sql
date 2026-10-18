do $verify$
declare old_m jsonb; reserved jsonb; complete_m jsonb; bad jsonb; blocked int:=0;
begin
 old_m:='{"version":2,"clock":{"startedAt":1000,"manualStarted":true},"jobs":[{"id":"gift","team":"A","count":5}]}';
 bad:=jsonb_set(old_m,'{jobs,0,count}','4');
 begin perform private.validate_shot_queue(old_m,bad);raise exception 'unplayed decrease was accepted';exception when check_violation then blocked:=blocked+1;end;
 reserved:=jsonb_set(old_m,'{jobs,0,count}','4')||'{"cue":{"id":"one","team":"A","startsAt":1000,"durationMs":10000,"playbackProtocol":204,"playbackOwner":"test-player"}}';
 perform private.validate_shot_queue(old_m,reserved);
 complete_m:=jsonb_set(reserved,'{cue}',reserved->'cue'||'{"videoStartedAt":1100,"videoFinishedAt":11100,"videoPlayedSeconds":9.85,"videoElapsedMs":10000,"videoPlaybackOwner":"test-player"}');
 if private.shot_pending(complete_m)->>'A'<>'4' then raise exception 'completion did not spend exactly one';end if;
 perform private.validate_shot_queue(reserved,complete_m);
 bad:=jsonb_set(complete_m,'{jobs,0,count}','3');
 begin perform private.validate_shot_queue(reserved,bad);raise exception 'extra disappearance was accepted';exception when check_violation then blocked:=blocked+1;end;
 bad:=jsonb_set(complete_m,'{cue,videoPlayedSeconds}','0.5');
 if private.shot_complete(bad,bad->'cue',false) then raise exception 'half-second was accepted';end if;
 perform private.validate_shot_queue(old_m,old_m||'{"jobs":[],"queueEdit":{"id":"explicit-admin-reset","kind":"reset"}}');
 bad:=jsonb_set(old_m,'{clock,manualStarted}','false');
 begin perform private.validate_shot_queue(bad,jsonb_set(bad,'{jobs,0,count}','4'));raise exception 'pre-match disappearance accepted';exception when check_violation then blocked:=blocked+1;end;
 if blocked<>3 then raise exception 'guard test count mismatch';end if;
end;
$verify$;
select 'PASS: pre-match deletion, unplayed removal and extra decrement rejected; reservation, full-playback one-shot spend and explicit reset accepted; partial playback rejected' as verification;
