# Scopum Tech - System Fixes

## Development Tasks
- [x] Add missing CRUD functions to api.ts (createZone, updateZone, deleteZone, createFacialRecord, updateFacialRecord, deleteFacialRecord)
- [x] Rewrite Zones.tsx with full CRUD (create/edit/delete zone dialogs)
- [x] Fix Reports.tsx date filtering to actually filter events by date range
- [x] Fix StreamPlayer.tsx SnapshotPlayer to use SDK auth headers instead of raw fetch
- [x] Add auto-refresh polling to Index.tsx dashboard (30s interval)
- [x] Add CRUD UI to FacialRecognition.tsx (create/delete facial records)

## Files to Modify (6 files)
1. `src/lib/api.ts` - Add missing CRUD functions
2. `src/pages/Zones.tsx` - Full CRUD with dialog forms
3. `src/pages/Reports.tsx` - Fix date filter logic
4. `src/components/StreamPlayer.tsx` - Fix SnapshotPlayer API calls
5. `src/pages/Index.tsx` - Add auto-refresh
6. `src/pages/FacialRecognition.tsx` - Add CRUD UI