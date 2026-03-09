# File Ignore 1.1.0 Plan

## Goal

Make File Ignore safer and more predictable before adding new features.

## Scope

### 1. Plan-before-execute
- Build an explicit rename plan before Hide/Show runs.
- Detect and skip:
  - protected paths (`.obsidian/`, `.git/`, `.trash/`)
  - existing destination conflicts
  - duplicate target paths
  - nested children whose parent directory is already planned
- Show a preview in the confirmation dialog.

### 2. Recovery / undo
- Persist the last batch state in plugin data.
- Record completed and pending rename operations during execution.
- When a batch is interrupted or partially fails, expose a recovery action in settings.
- Allow undoing the last completed batch from the settings page.

### 3. Settings model cleanup
- Centralize shared types/default settings in one place.
- Align package/manifest/versions to 1.1.0.

### 4. Docs and messaging
- Clarify that this plugin renames files/folders on disk.
- Document the new plan preview and recovery behavior.

## Non-goals for 1.1.0
- Multi-profile rule sets
- Auto hide/show on startup/shutdown
- Fully async/cancellable scanner rewrite

## Expected outcomes
- Fewer destructive surprises
- Better rollback story after crashes/interrupted runs
- Clearer user understanding of what Hide/Show will do
