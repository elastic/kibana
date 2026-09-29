# RFC: Guarding stored AlertZero Worker settings against breaking changes

**Status:** draft, part of [kibana#293403](https://github.com/elastic/kibana/pull/293403). Kept in the
PR for review; expected to be removed or folded into the plugin README before merge.
**Issue:** [security-team#19467](https://github.com/elastic/security-team/issues/19467).
**Related:** [security-team#19312](https://github.com/elastic/security-team/issues/19312) (settings
migration flow, not built yet).

## Summary

AlertZero Workers keep one copy of their settings per Kibana space. When a Watch team changes a
Worker's settings schema, every space that already stored the old shape must still read after the
upgrade. Today nothing checks that. This PR adds unit tests that fail in CI when a settings change
would break stored documents, tell the developer whether the change is safe or breaking, and give
the exact next step. It changes one thing at runtime: a stored autonomy level the Worker no longer
allows is now written back at startup as the nearest allowed level below it, so the settings page
and the running workflow agree. It adds nothing to the Buildkite pipeline.

## Background

A few terms, since they are used throughout:

- **Worker.** A background job that AlertZero runs per space, such as Rule Tuning or Attack
  Discovery. Each Worker is a managed workflow, installed from a YAML template.
- **Watch team.** The product team that owns a group of Workers, for example Detection Watch owns
  Rule Tuning. Watch teams add and change their Workers' settings.
- **Common Worker Layer (CWL).** The team that owns the shared settings contract, the settings page
  and the code that reads and writes settings.
- **Stored settings.** When a space enables a Worker, its settings are saved with that space's copy
  of the workflow. A stored Rule Tuning document looks like this:

  ```json
  {
    "settingsVersion": 1,
    "autonomyLevel": "assisted",
    "scheduleInterval": "6h",
    "extras": { "analysisWindowDays": 21, "fpCountThreshold": 4, "fpRateThresholdPct": 80 }
  }
  ```

  `autonomyLevel` and `scheduleInterval` are shared by all Workers. `extras` holds the fields a Watch
  team adds for its own Worker.

A setting travels from storage to the running workflow in four steps:

1. The stored document is read and validated against the Worker's settings schema
   (`server/managed_workflows/workers/worker_settings.ts`).
2. The validated values become template values.
3. A render helper replaces placeholders in the Worker's YAML with those values
   (`kbn-workflows/managed/definitions/alertzero/worker_template_values.ts`).
4. The workflow steps read the result:

   ```yaml
   consts:
     worker_settings:
       autonomy: "__WORKER_AUTONOMY_LEVEL__"
       extras: __WORKER_EXTRAS__
   steps:
     - with:
         analysis_window_days: "${{ consts.worker_settings.extras.analysisWindowDays }}"
   ```

Where each piece lives:

| What | Where | Owner |
|---|---|---|
| Per-Worker settings schema: fields, bounds, allowed autonomy levels | `kbn-alertzero-common/impl/schemas/components/*_watch_settings.schema.yaml`, generated into `*.gen.ts` | Watch team |
| Declaration: allowed levels, schedule default, extras defaults | `kbn-alertzero-common/impl/worker_settings/<watch>.ts` | Watch team |
| Reading stored settings | `plugins/alertzero/server/managed_workflows/workers/worker_settings.ts` | CWL |
| Startup fill of missing keys | `plugins/alertzero/server/managed_workflows/apply_missing_installed_worker_settings.ts` | CWL |
| Workflow YAML and render helpers | `kbn-workflows/managed/definitions/alertzero/` | Watch team (YAML), CWL (helpers) |
| The guard added by this PR | `plugins/alertzero/server/managed_workflows/workers/fixtures/`, `test_helpers/`, `worker_settings_compat.test.ts` | CWL |

## The problem

After an upgrade, new code reads old documents. Some schema changes make an old document
unreadable:

- renaming `analysisWindowDays` to `lookbackDays`,
- raising the minimum of `fpCountThreshold` from 2 to 3,
- changing a field's type.

Removing an allowed autonomy level has a related problem, covered in the first part of the solution.

When that happens, the Worker shows as unavailable in every space that stored the old shape, and a
save from the settings page returns 409. Unit tests did not catch it, because they test with fresh
defaults, which always match the current schema.

There is no migration flow yet ([security-team#19312](https://github.com/elastic/security-team/issues/19312)),
so a breaking change has nowhere safe to go. It must at least fail loudly in CI.

## Goals

1. A breaking settings change cannot ship by mistake.
2. The protection does not depend on anyone reading documentation.
3. Customers are never affected; failures happen in CI, for developers.
4. Adding a setting never strands Workers that are already configured.
5. The rules are clear for Watch teams: what is safe, what is breaking, what to do next.
6. Future cases are caught generically, not only the ones found so far.
7. Coverage does not depend on Watch teams remembering to add test fixtures.

## Non-goals

- **A migration flow** that converts old documents. That is
  [security-team#19312](https://github.com/elastic/security-team/issues/19312).
- **Workflow versioning.** Installed spaces get new YAML only when a Worker's definition `version`
  goes up, and `managed_workflow_definitions.test.ts` already fails a YAML edit until it does. This
  PR adds nothing there.
- **Runtime behaviour for customers.** AlertZero is off by default and has no customers yet.

## What already exists on `main`

- **Missing keys are filled from defaults.** When a stored document lacks a `scheduleInterval` or
  an `extras` key that the current declaration has, the default is filled in on read and written back
  by a startup pass before the plugin reports ready
  ([kibana#293419](https://github.com/elastic/kibana/pull/293419), with a concurrency fix in
  [kibana#293558](https://github.com/elastic/kibana/pull/293558)). This is what makes adding a
  field safe at runtime. Stored values are never overwritten.
- **YAML edits need a definition version bump**, enforced by `managed_workflow_definitions.test.ts`.

## The solution

| Part | What it catches | Kind of change |
|---|---|---|
| Lowering a disallowed autonomy level at startup | A settings page and a running workflow that disagree after levels are narrowed | Runtime |
| Stored fixtures with expected output | A stored shape that no longer reads, renders or installs | Test |
| Settings contract snapshot and generator | Any schema or default change, classified safe or breaking | Test, one committed JSON file, a script |
| Comparison with the base branch | Regenerating the snapshot to hide a breaking change | Test |

### 1. The one runtime change: a narrowed autonomy level is written back, lowered

Workers' allowed autonomy levels get narrowed as product decisions land. Rule Tuning and Rule
Creation dropped `supervised`, Attack Discovery dropped `assisted`, and more narrowing is planned.
Spaces that saved a level before it was removed still store it.

On `main`, the read path lowered such a level: Rule Tuning `supervised` was read as `assisted`. The
stored copy was never rewritten, so the running workflow kept `supervised`. The child workflows only
accept the allowed levels:

```yaml
# rule_tuning_worker.yaml, the sweep Rule Tuning dispatches
autonomy_level:
  type: string
  enum: [manual, assisted]
```

So the sweep rejected its input on every run, while the settings page showed a healthy Worker at
`assisted`. Only a manual save on the settings page fixed it.

This PR makes the startup pass apply the same lowering and write it back, in the same step that
already fills missing keys. Both the read path and the startup pass call one function:

```ts
export const upgradeStoredWorkerSettings = (declaration, stored) =>
  lowerDisallowedAutonomy(
    declaration,
    fillMissingExtras(declaration, fillMissingSchedule(declaration, stored))
  );
```

`lowerDisallowedAutonomy` picks the most autonomous allowed level strictly below the stored one. It
never raises autonomy, and it keeps a stored level that has nothing allowed below it, which then
fails validation as before. The startup pass reinstalls the document before the plugin reports
ready, bound to the document version it read so a concurrent save is not overwritten, and logs
each change:

```text
Reinstalled AlertZero worker "system-security-detection-rule-tuning-default" in space "default"
with its stored settings upgraded to the current declaration, autonomy lowered from "supervised"
to "assisted" because the Worker no longer allows it
```

After startup the page, the stored document and the running workflow all hold the same level, with
no manual step and no reset. A test covers every Worker and every level it does not allow: the read
and the startup pass must produce the same lower level, and the rendered workflow must run at it.

### 2. Stored fixtures

`workers/fixtures/<worker_id_in_snake_case>/*.json` are copies of document shapes that environments
have actually stored. They are written by hand, not generated from code, because their job is to
stay the same when the code changes.

A Worker has several fixtures when its stored shape changed over time. Rule Tuning has four:

| Fixture | The shape it stands for |
|---|---|
| `autonomy_only.json` | Early builds, before the schedule and extras existed |
| `qa_schedule_only.json` | A schedule, no extras |
| `analysis_window_only.json` | After `analysisWindowDays` was added, before the FP thresholds |
| `current.json` | Today's full shape, with non-default values so a wrong read shows up |

Next to a fixture, `<name>.expected.txt` lists lines the rendered workflow must contain, one per
line, only for values the fixture stores:

```text
every: "6h"
autonomy: "assisted"
"analysisWindowDays":21
```

For every fixture, `worker_settings_compat.test.ts` checks that it:

1. reads without error,
2. renders YAML with no `undefined` and no leftover `__WORKER_…__` placeholder,
3. renders every line in its `.expected.txt`,
4. would install as a valid workflow (managed install stores an invalid workflow with
   `valid: false` instead of throwing, so this is checked explicitly),
5. reads back exactly as stored, which catches any read that rewrites a value.

A registered Worker with no fixture folder fails with a message naming the two files to add.
Adding a Worker never means editing the test file.

### 3. The settings contract snapshot

`test_helpers/settings_contract.snapshot.json` records, for every Worker, the schema a stored
document must satisfy and the declaration defaults. It is generated from the code:

```bash
node x-pack/solutions/security/plugins/alertzero/scripts/generate_settings_contract_snapshot.js
```

An excerpt:

```json
"system-security-detection-rule-tuning": {
  "defaults": {
    "autonomy": "manual",
    "scheduleInterval": "2h",
    "extras": { "analysisWindowDays": 7, "fpCountThreshold": 10, "fpRateThresholdPct": 50 }
  },
  "schema": {
    "fields": {
      "autonomy": { "kind": "leaf", "type": "string", "enum": ["manual", "assisted"] },
      "extras": {
        "fields": {
          "analysisWindowDays": { "kind": "leaf", "type": "integer", "minimum": 1, "maximum": 30 }
        }
      }
    }
  }
}
```

The schema part is the zod schema converted to JSON Schema, from the input side. The input side
matters: it is what a stored document has to pass, including each Worker's own allowed autonomy
levels and bounds.

The test compares the live code with this file. Each difference is labelled:

| Change | Classified as | Why |
|---|---|---|
| New field with a default, new optional field | Safe | The startup fill supplies it to stored documents |
| Loosened bound, widened enum, allowed `null` | Safe | Every stored value still passes |
| Changed default | Safe | Stored documents keep their value; the new default reaches fresh installs only |
| New schedule on an existing Worker | Safe | It starts on the next save or enable in each space |
| Removed autonomy level that has a lower allowed level | Safe | The startup pass lowers stored documents to the nearest allowed level |
| Removed lowest autonomy level | Breaking | There is no lower level to move stored documents to |
| Removed, renamed or retyped field | Breaking | Stored documents hold a key or type the schema rejects |
| Tightened bound or array size, narrowed enum (other than autonomy), free string turned into an enum, dropped `null` | Breaking | Stored values may fall outside |
| New required field without a default, or one the startup fill cannot reach (inside a nested object) | Breaking | Stored documents cannot supply it |
| Removed Worker | Breaking | Its stored documents no longer have a reader |

A safe change fails once and asks for the snapshot to be regenerated:

```text
This change is safe for stored Worker settings.
- [safe] added system-security-detection-rule-tuning.extras.maxGaps with a default

Update the snapshot with:
node x-pack/solutions/security/plugins/alertzero/scripts/generate_settings_contract_snapshot.js
```

A breaking change says so, lists the exits, and the generator refuses to write:

```text
This change breaks stored Worker settings.
- [breaking] tightened system-security-detection-rule-tuning.extras.fpCountThreshold minimum from 2 to 3

Configured Workers that stored the old shape will show as unavailable. It needs a migration under
https://github.com/elastic/security-team/issues/19312 (not built yet), or, before customers exist,
a coordinated reset (plugin README, "Pre-customer state").
If only the label on the page should change, keep the stored key and value.
Before customers exist, a breaking change can go in only with a coordinated reset of the affected
environments. Agree it with the Common Worker Layer team on an issue, then run:
node x-pack/solutions/security/plugins/alertzero/scripts/generate_settings_contract_snapshot.js --pre-customer-reset <issue-url>
```

JSON Schema keywords the classifier does not understand fail the build with "Unclassified … Teach
the Worker settings contract check about it", instead of being silently dropped. When a Watch team
first uses, say, a date-time format, CWL extends the classifier.

### 4. Breaking changes before customers

Until the migration flow exists, the only way to ship a breaking change is to reset the environments
that hold old documents, which is only possible while AlertZero has no customers. The flag says so in
its name:

1. The Watch team tries the label-only fix first: keep the stored key and value, change only what
   the settings page shows.
2. If the change is really needed, they open an issue describing it and the environments to reset,
   and agree it with CWL.
3. They run the generator with `--pre-customer-reset <issue-url>`. It records the reset in the
   snapshot:

   ```json
   "preCustomerResets": [
     {
       "issue": "https://github.com/elastic/security-team/issues/NNNNN",
       "changes": ["tightened system-security-detection-rule-tuning.extras.fpCountThreshold minimum from 2 to 3"]
     }
   ]
   ```

4. The entry shows up in the PR diff for review.
5. After merge, the affected environments are reset.

Once customers store settings, a reset is not an option. The PR that lands the migration flow
replaces this flag with a machine check: a breaking change must come with a settings version bump
and a migration step for it. Until then, a breaking change with customers stays red.

### 5. Comparison with the base branch

The generator refuses to write a breaking change. A developer could still delete the snapshot and
regenerate it. A second test closes that: it compares the current schemas with the snapshot as it is
on the base branch, and requires a new `preCustomerResets` entry for any breaking difference.

The test does not check out another branch. Git keeps every version of every file, and
`git show <commit>:<path>` prints a file as it was at that commit, from the local `.git`. A PR's
history always contains the commit where it branched off, and Buildkite exports that commit to every
PR step as `GITHUB_PR_MERGE_BASE`:

```ts
const base = process.env.GITHUB_PR_MERGE_BASE;
const baseSnapshot = git(['show', `${base}:./settings_contract.snapshot.json`]);
```

A PR build fails loudly if the merge base is missing or not in the checkout, so the check cannot
switch itself off. Locally it uses the nearest remote default branch, and is skipped if there is
none. It takes effect once the snapshot exists on `main`.

### Considered and dropped: a render fingerprint

A hash of each Worker's rendered YAML, per definition version, was tried. For YAML edits it
duplicated the existing definition-version check, so a prompt edit would have needed two entries
updated. Its only unique catch was an edit to a render helper made without a version bump: the
platform decides whether to update installed copies by hashing the `yamlTemplate` function's source
text, which does not include the helper it calls. That is a workflow versioning gap, not a settings
compatibility one, so it is left to the Workflows platform. Until it is addressed, the plugin README
states that a render-helper change needs a definition version bump.

## How the goals are met

| Goal | How |
|---|---|
| 1. Breaking changes cannot ship by mistake | The contract test classifies every change. The generator refuses a breaking one without `--pre-customer-reset`. The base-branch comparison keeps a deleted-and-regenerated snapshot red. A CODEOWNERS entry routing the snapshot to CWL is a planned follow-up; until then a deliberately hand-written reset entry is visible in the diff but not routed to CWL |
| 2. Does not depend on documentation | The tests fire on the change itself, and each message names the next command |
| 3. Customers are never affected | The guard is unit tests only. Test helpers and snapshots live in `test_helpers/`, which the distributable build excludes. The one runtime change moves a narrowed autonomy level to the nearest allowed level below it, never above, so page and workflow agree |
| 4. Adding a setting never strands configured Workers | Defaults are filled at startup (already on `main`). An added field with a default, including a boolean or an array, produces only a `[safe]` line |
| 5. Clear for Watch teams | The plugin README has a "Changing Worker settings safely" section with a change-kind table. Every failure line is labelled `[safe]` or `[breaking]` |
| 6. Future cases are caught | The snapshot is compared field by field, so any removal, retype, tightened bound or narrowed enum is caught without a hand-kept list. A narrowed autonomy level is reported with the level stored documents are moved to. Unknown schema features fail loudly |
| 7. No reliance on remembering fixtures | The snapshot is generated from the declarations. A new field needs no fixture. A new Worker without fixtures fails with a message naming the files to add |

## What a Watch team does

**Add a setting.** Add the field to the schema YAML and run `yarn openapi:generate`, then add a
default:

```ts
export const RULE_TUNING_DEFAULT_EXTRAS = {
  analysisWindowDays: 7,
  fpCountThreshold: 10,
  fpRateThresholdPct: 50,
  maxGaps: 3, // new
};
```

Use it in the YAML and bump the definition version, as `main` already requires. CI then reports
`[safe] added …extras.maxGaps with a default`; run the generator and push. On the next startup,
every configured space gets `maxGaps: 3`, and values it already stores stay as they are.

**Change a default.** Reported as `[safe]`. Run the generator. The new default reaches fresh
installs only.

**Edit only the YAML (a prompt, a step).** The settings guard does not fire. Bump the definition
version, as `main` already requires.

**Remove an allowed autonomy level.** When a lower allowed level remains, for example Attack
Discovery moving from `manual`/`supervised` to `manual`/`assisted`, CI reports
`[safe] removed supervised … A stored supervised is lowered to assisted at startup`. Run the
generator; configured spaces are moved at the next startup. Removing the lowest allowed level is
breaking.

**Rename, remove or retype a field, tighten a bound.** Reported as
`[breaking]`. Prefer keeping the stored key and changing only the label. Otherwise, before
customers, agree a reset on an issue and use `--pre-customer-reset`. After that, only a migration.

**Add a Worker.** Add `fixtures/<worker_id_in_snake_case>/current.json` with the settings a
configured space would store and `current.expected.txt` with lines its rendered workflow must
contain, then run the generator. The contract test reports `[safe] added Worker …`.

## What the Common Worker Layer team does

- Owns the guard and extends the classifier when a new schema feature appears.
- Reviews snapshot changes and every recorded reset.
- Decides breaking changes: label-only fix, reset (before customers), or migration.
- Builds the migration flow ([security-team#19312](https://github.com/elastic/security-team/issues/19312)),
  which replaces the reset flag and the settings-version tripwire test.

## Limitations and follow-ups

- **CODEOWNERS.** All AlertZero paths are owned by `@elastic/security-solution` today, so any
  reviewer from that team can approve a snapshot change. A follow-up adds a CODEOWNERS entry for
  `test_helpers/` and `worker_settings_compat.test.ts`, owned by a CWL team.
- **Zod refinements are not in the contract.** The OpenAPI generator emits the `nonempty` and
  `date-math` formats as `.superRefine`, which JSON Schema cannot express, so tightening one is not
  caught. No settings field uses them today.
- **Render-helper edits** without a definition version bump are not caught, as described above.
- **Rollback.** An older Kibana reading a document written by a newer one rejects unknown keys and
  shows the Worker as unavailable, leaving the stored values untouched. That is the MVP behaviour
  recorded on [security-team#19312](https://github.com/elastic/security-team/issues/19312). During a
  mixed-version deploy it can make a Worker briefly unavailable on older nodes after a field is
  added. The usual Kibana alternative is to drop unknown keys on read and reject them on write.

## Prior art in Kibana

- **Saved-object model versions.** `packages/kbn-check-saved-objects-cli` diffs registered types
  against the snapshot from the merge base and fails on removed fields, changed types and new
  required fields.
- **Task Manager `stateSchemaByVersion`.** A versioned schema with an `up` step per version; the
  likely model for the migration flow.
- **Encrypted saved objects.** `x-pack/platform/plugins/shared/encrypted_saved_objects/integration_tests/ci_checks/check_registered_types.test.ts`
  uses the same committed-snapshot pattern.
