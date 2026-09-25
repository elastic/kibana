# Worker settings migrations

Stored Worker settings are template values on the managed-workflow document: `settingsVersion`, `autonomyLevel`, `scheduleInterval`, and `extras`. Read, settings save, and startup all run the same migration before the current schema is applied. Startup reinstalls the Worker before `ready()` when the result differs from what is stored and still validates. A document that is still invalid is left in place and the Worker stays unavailable.

The pipeline, in order:

1. Shared field renames (`SHARED_FIELD_MIGRATIONS` in `plugins/alertzero/server/managed_workflows/workers/worker_settings.ts`).
2. This Worker's `migrations` chain, one step per `settingsVersion` after 1.
3. Fill a missing `scheduleInterval` from the declaration default, when the Worker declares one.
4. Fill missing `extras` keys from `extras.defaultValue`. Present keys are kept, including values the schema will reject.
5. Project `autonomyLevel` down to the closest level the Worker still offers.
6. Drop `scheduleInterval` when the Worker no longer declares one.
7. Stamp `settingsVersion` with the declaration's current version.

A present value is not replaced, and changing a default does not rewrite documents that already store that key. A stored version newer than the running code is rejected. `migrations.length` must be `settingsVersion - 1`.

## Add a field that has a default

Leave `settingsVersion` at its current number and do not add a migration step. Put the default on the declaration (`scheduleInterval.defaultValue` or `extras.defaultValue`). An older document receives that default for the missing key. A value the user already saved stays as stored.

## Rename or reshape a stored value

Bump that Worker's `settingsVersion` by 1 and append one step to `migrations` on its declaration in this folder. `migrations[0]` upgrades stored version 1 to 2. The step sees template values (`autonomyLevel`, not the API's `autonomy`). Return the same object when there is nothing to do, and do not mutate the input. The runner stamps `settingsVersion` after the step.

Copy the old value onto the new key before dropping the old one. `renameStoredField` does that. The default fill then supplies any new key the step did not set.

```ts
import { renameStoredField } from './migrate';
import type { WorkerSettingsDeclaration } from './types';

// settingsVersion was 1. analysisWindowDays moved to windowDays.
export const RULE_TUNING_SETTINGS: WorkerSettingsDeclaration = {
  settingsVersion: 2,
  migrations: [
    (stored) => {
      const { extras } = stored;
      if (typeof extras !== 'object' || extras === null || Array.isArray(extras)) {
        return stored;
      }
      const renamed = renameStoredField(
        extras as Record<string, unknown>,
        'analysisWindowDays',
        'windowDays'
      );
      if (renamed === extras) {
        return stored;
      }
      return { ...stored, extras: renamed };
    },
  ],
  // extras.defaultValue uses windowDays, the current name.
};
```

A stored `analysisWindowDays: 21` becomes `windowDays: 21`. Other extras keys that are still missing are filled from the defaults. A stored `0` stays `0` and the document remains unavailable.

## Rename a shared field

`scheduleInterval` becoming `runInterval` is not a per-worker step. Every Worker's document stores the old key, and each Worker has its own `settingsVersion`. Add an idempotent step to `SHARED_FIELD_MIGRATIONS`. It runs before the per-worker chain. In the same change, teach the parser, the OpenAPI field, the template-value type, and the workflow placeholder the new name, and stop declaring `scheduleInterval`.

```ts
export const SHARED_FIELD_MIGRATIONS = [
  (stored: Record<string, unknown>) => renameStoredField(stored, 'scheduleInterval', 'runInterval'),
];
```

The step copies a stored `2h` onto `runInterval` and drops `scheduleInterval`. A document that never had an interval still needs a default on whatever declaration field replaced it. Until that field exists, the default fill will not invent `runInterval`.

## What stays a hard failure

- A present value outside its bounds, unless this Worker's migration step changes it.
- A stored `settingsVersion` newer than this code.
- A version bump with no step.
- A PATCH that sends the previous extras object. Writes still have to be the complete current object. Toggling `enabled` does not rewrite settings; startup does.
