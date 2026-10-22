# LIVE statistics recovery fix

An ended active record previously rejected all later events, including when the record was a manually created empty placeholder. Subsequent manual empty records did not recover the stream. The three persisted old placeholders had no received events; match reports had independent gift data.

New received events now open a fresh automatic record after a manually ended active record or an old nonautomatic record. Existing genuine stream-end replay handling and duplicate receipts remain. A retired known room cannot switch the current broadcast. Unknown-room events after a genuine stream-end can create a new record after a one-minute gap. No historical totals, viewer counts or exact broadcast boundaries are invented.

The UI labels the duration “Yayın süresi”, in minutes, explicitly marking the recorded portion. Empty placeholders show “Veri alınmamış”, unknown counts and unknown duration. Total gifts, 10-coin gifts, 100-coin gifts and total coins have separate cards. Unlinked saved match gifts are presented as a separate recovered aggregate, with an explicit warning that it cannot be assigned to individual broadcasts or treated as a full LIVE total. Stored rows are not deleted or rewritten.

Unit and mobile/desktop browser tests reproduce three ended empty records, receive new gift/like/viewer events, preserve de-duplication, show independent historical gift totals and the duration label, and verify manual closing/new event recovery. Tests use mocked writes only.
