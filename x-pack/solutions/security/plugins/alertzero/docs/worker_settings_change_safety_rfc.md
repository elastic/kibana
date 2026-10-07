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
the exact next step. It changes one thing at runtime: every Worker's renderer upgrades the stored
values the same way the settings read path does (missing defaults filled, a disallowed autonomy
level lowered), without rewriting the stored document, so the settings page and the running
workflow agree for Workers that run as a service account. It adds nothing to the Buildkite
pipeline.

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
| Per-Worker allowed levels and defaults, and the upgrade applied on read and render | `kbn-workflows/managed/definitions/alertzero/worker_settings_defaults.ts` | Watch team (values), CWL (upgrade) |
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

- **Missing keys are filled on read.** When a stored document lacks a `scheduleInterval` or an
  `extras` key that the current declaration has, the read path fills the default
  ([kibana#293419](https://github.com/elastic/kibana/pull/293419)).
- **Every Worker runs as a service account**
  ([kibana#295215](https://github.com/elastic/kibana/pull/295215)). The platform rejects a write
  without a user request that changes a bound workflow's stored values.
- **YAML edits need a definition version bump**, enforced by `managed_workflow_definitions.test.ts`.

## The solution

| Part | What it catches | Kind of change |
|---|---|---|
| Render-time upgrade of stored settings | A settings page and a running workflow that disagree after a setting is added or levels are narrowed | Runtime |
| Stored fixtures | A stored shape that no longer reads, or reads and renders differently from its upgraded form | Test |
| Settings contract snapshot, with an update mode in the test | Any schema or default change, on the Worker's own schema, the shared `WorkerSettings` stage and the save body, classified safe or breaking | Test, one committed JSON file |
| Comparison with the base branch | Regenerating the snapshot to hide a breaking change | Test |

### 1. The one runtime change: stored settings are upgraded at render time

A stored document can be behind the current declaration in two ways. A Watch team adds a setting
with a default, and every space that stored settings before that has no value for it. Or a Watch
team narrows a Worker's allowed autonomy levels (Rule Tuning dropped `supervised`, Attack Discovery
dropped `assisted`, more is planned), and spaces that saved a removed level still store it.

The settings read path already fills missing keys and lowers a disallowed level, so the page looks
right. The running workflow is a different matter. A Worker runs as a service account, and the
Workflows platform lets a write without a user request touch a bound workflow only when its stored
template values stay the same. That is how a definition upgrade at `ready()` re-renders YAML from
the stored values. Any background rewrite of the values is rejected. So the running workflow would
keep the old shape: a missing setting renders as nothing (Alert Triage renders the literal text
`undefined`), and a removed level renders as is, which the child workflows reject on every run:

```yaml
# rule_tuning_worker.yaml, the sweep Rule Tuning dispatches
autonomy_level:
  type: string
  enum: [manual, assisted]
```

This PR makes every Worker's renderer apply the same upgrade the read path applies, and never
rewrites the stored document:

```ts
yamlTemplate: (values: RuleTuningWorkerTemplateValues): string =>
  renderRuleTuningWorkerYaml(
    DETECTION_RULE_TUNING_YAML,
    upgradeStoredWorkerSettings(RULE_TUNING_WORKER_SETTINGS_DEFAULTS, values)
  ),
```

`upgradeStoredWorkerSettings` fills a missing schedule or `extras` key from the Worker's default,
ignores `extras` a Worker no longer declares, and lowers a disallowed autonomy level to the most
autonomous allowed level strictly below it. It never raises autonomy, keeps a stored level that has
nothing allowed below it (which then fails validation as before), and never modifies the values it
is given, which matters because the platform persists those same values after rendering.

The function and each Worker's allowed levels and defaults live in
`kbn-workflows/managed/definitions/alertzero/worker_settings_defaults.ts`, because the renderers are
in that platform package and it cannot import `@kbn/alertzero-common`. That module has no imports,
so `@kbn/alertzero-common` builds its declarations from it and re-exports the function for the read
path, also from the browser. Nothing is defined twice.

Stored values are unchanged, so the platform treats the re-render as a trusted code upgrade, and an
installed copy picks the change up the next time its definition version moves and `ready()`
re-renders it. The existing version check in `managed_workflow_definitions.test.ts` enforces that:
each Worker's fingerprint row now covers its settings defaults as well as its YAML, so changing a
default, the allowed levels or the declared extras fails the same row a YAML edit does. No new
mechanism, and a YAML-only edit still touches nothing CWL owns. The page, the rendered workflow and the stored document then agree on what runs, with no
manual step, no reset and no write without a user request. A re-render does not reschedule the
Task Manager task, so a trigger that depends on the level changes on the next save or enable.

Tests cover every Worker: a document missing each defaulted key reads and renders exactly like one
that stores the default; every level a Worker does not allow reads and renders as the same lower
level; and rendering a frozen copy of every fixture leaves it unchanged.

### 2. Stored fixtures

`workers/fixtures/<worker_id_in_snake_case>/*.json` are stored document shapes. They are written by
hand, not generated from code, because their job is to stay the same when the code changes. Every
fixture carries a `serviceAccountId`, as every stored Worker document does, so the rendered
`run_as` line is covered too.

`current.json` is the shape a space stores today, with non-default values so a wrong read shows up.
The others are named by the case they test. A document missing a key added later is not legacy; it
is what every configured space looks like after a Watch team adds a setting. Rule Tuning has four:

| Fixture | The case it tests |
|---|---|
| `missing_schedule_and_extras.json` | No schedule and no extras |
| `missing_extras.json` | A schedule, no extras |
| `partial_extras.json` | Some extras keys, not all |
| `current.json` | Today's full shape |

For every fixture, `worker_settings_compat.test.ts` checks that it reads without error, renders
without throwing, and reads back exactly as stored (which catches any read that rewrites a value).
From each Worker's `current.json` it also checks the render boundary: a document missing a defaulted
key reads and renders exactly like one that stores the default, a no-longer-allowed autonomy level
exactly like the level it is lowered to, and rendering a frozen copy leaves it unchanged.

These checks compare renders with each other and never assert what the rendered workflow contains.
Rules about workflow content (no `undefined`, required YAML fragments, every stored setting changing
the YAML) would also fail valid Watch-owned changes such as a prompt edit, moving a value within the
YAML, or retiring a setting from execution while keeping it readable, and clearing those false
alarms would mean editing a CWL-owned test. Workflow content stays with the Watch teams' managed
definition and registry tests.

A registered Worker without `current.json` fails with a message naming the file to add. Adding a
Worker never means editing the test file.

### 3. The settings contract snapshot

`test_helpers/settings_contract.snapshot.json` records, for every Worker, the schema a stored
document must satisfy and the declaration defaults, plus the shared schemas described below. A normal
test run only compares; the test's update mode rewrites it:

```bash
UPDATE_WORKER_SETTINGS_CONTRACT=true node scripts/jest x-pack/solutions/security/plugins/alertzero/server/managed_workflows/workers/worker_settings_compat.test.ts
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

Two more validations sit on the same paths and are recorded once, under `shared`:

- **`WorkerSettings`.** Every Worker's complete schema is its own object piped into this shared
  schema, and the JSON Schema of a pipe shows only the first stage. Tightening `WorkerSettings`
  (say, `serviceAccountId` down to 512 characters) rejects stored documents without changing any
  Worker's entry, so it is snapshotted on its own. The contract build fails if a Worker's complete
  schema pipes into anything else.
- **`WorkerSettingsWrite`.** The `settings` body of a save is validated before the patch is applied.
  Dropping `nullable` from its `serviceAccountId` breaks the save that clears an account, and a lower
  maximum on the body alone rejects saves that used to pass, while stored documents stay readable.

Both are compared with the same rules, so `[breaking] stopped allowing null on
WorkerSettingsWrite.serviceAccountId` reads like any other line.

Validation JSON Schema cannot express is the remaining hole: `z.toJSONSchema` silently drops
`.refine`, `.superRefine`, `.check`, transforms, preprocess and pipes, so
`z.number().refine((value) => value !== 13)` converts exactly like `z.number()`. Before converting,
the contract walks each schema and fails on any of those with "Cannot establish settings
compatibility at …". That is reported as "cannot assess", not as a breaking change, and it fails
while the contract is built, so update mode cannot write and a breaking-change acceptance cannot
cover it. The owner either expresses the constraint as a bound, an enum or a pattern, or CWL teaches
the contract to compare it.

The test compares the live code with this file. Each difference is labelled:

| Change | Classified as | Why |
|---|---|---|
| New field with a default, new optional field | Safe | The read path and the renderer fill it for stored documents |
| Loosened bound, widened enum, allowed `null` | Safe | Every stored value still passes |
| Changed default | Safe | Stored values win; the new default reaches fresh installs and every stored document that does not hold the field |
| New schedule on an existing Worker | Safe | It starts on the next save or enable in each space |
| Removed autonomy level that has a lower allowed level | Safe | The read path and the renderer lower it to the nearest allowed level; a level-dependent trigger changes on the next save or enable |
| Removed `extras` from a Worker | Safe | The read path and the renderer ignore stored extras |
| Removed lowest autonomy level | Breaking | There is no lower level to move stored documents to |
| Removed, renamed or retyped field | Breaking | Stored documents hold a key or type the schema rejects |
| Tightened bound or array size, narrowed enum (other than autonomy), free string turned into an enum, dropped `null` | Breaking | Stored values may fall outside |
| New required field without a default, or one the upgrade cannot reach (inside a nested object) | Breaking | Stored documents cannot supply it |
| Removed Worker | Breaking | Its stored documents no longer have a reader |

A safe change fails once and asks for the snapshot to be regenerated:

```text
This change is safe for stored Worker settings.
- [safe] added system-security-detection-rule-tuning.extras.maxGaps with a default

Update the snapshot with:
UPDATE_WORKER_SETTINGS_CONTRACT=true node scripts/jest x-pack/solutions/security/plugins/alertzero/server/managed_workflows/workers/worker_settings_compat.test.ts
```

A breaking change fails the test with this message, and update mode refuses to write the snapshot
without an accepted issue:

```text
This change breaks stored Worker settings.
- [breaking] tightened system-security-detection-rule-tuning.extras.fpCountThreshold minimum from 2 to 3

Configured Workers that stored the old shape will show as unavailable. It needs a migration under
https://github.com/elastic/security-team/issues/19312 (not built yet), or, before customers exist,
a coordinated reset (plugin README, "Pre-customer state").
If only the label on the page should change, keep the stored key and value.
Before customers exist, a breaking change can go in only with a coordinated reset of the affected
environments. Agree it with the Common Worker Layer team on an issue, then run:
UPDATE_WORKER_SETTINGS_CONTRACT=true ACCEPT_WORKER_SETTINGS_BREAKING_CHANGE=<issue-url> node scripts/jest x-pack/solutions/security/plugins/alertzero/server/managed_workflows/workers/worker_settings_compat.test.ts
```

JSON Schema keywords the classifier does not understand fail the build with "Unclassified … Teach
the Worker settings contract check about it", instead of being silently dropped. When a Watch team
first uses, say, a date-time format, CWL extends the classifier. A schema `default` that the
Worker's declaration does not also have fails too: zod would apply it on read, while stored
documents and the running workflow only ever get declaration defaults.

### 4. Breaking changes before customers

Until the migration flow exists, the only way to ship a breaking change is to reset the environments
that hold old documents, which is only possible while AlertZero has no customers:

1. The Watch team tries the label-only fix first: keep the stored key and value, change only what
   the settings page shows.
2. If the change is really needed, they open an issue describing it and the environments to reset,
   and agree it with CWL.
3. They run update mode with `ACCEPT_WORKER_SETTINGS_BREAKING_CHANGE=<issue-url>`. It records the change and
   the issue in the snapshot:

   ```json
   "acceptedBreakingChanges": [
     {
       "issue": "https://github.com/elastic/security-team/issues/NNNNN",
       "changes": ["tightened system-security-detection-rule-tuning.extras.fpCountThreshold minimum from 2 to 3"]
     }
   ]
   ```

4. The entry shows up in the PR diff for review.
5. After merge, the affected environments are reset.

The list is append-only: the base-branch check fails when an entry the base branch has is dropped
or edited. Every breaking change against the base branch must be named in an entry this branch
added, so a hand-written `{ "issue": "…", "changes": [] }` does not hide a break. Update mode records
the lines against the base branch for that reason: tightening a bound from 1 to 3 and later to 5 in
the same PR records "1 to 5", the line the check computes. If the committed snapshot already matches the code (after a merge conflict, say) but
the base branch's does not, update mode still accepts the issue and records the break against
the base branch.

Once customers store settings, a reset is not an option. The PR that lands the migration flow
replaces this flag with a machine check: a breaking change must come with a settings version bump
and a migration step for it. Until then, a breaking change with customers stays red.

### 5. Comparison with the base branch

Update mode refuses to write a breaking change. A developer could still delete the snapshot and
regenerate it. A second test closes that: it compares the current schemas with the snapshot as it is
on the base branch, and requires every breaking difference to be listed in an `acceptedBreakingChanges` entry the PR added.

The test does not check out another branch. Git keeps every version of every file, and
`git show <commit>:<path>` prints a file as it was at that commit, from the local `.git`. A PR's
history always contains the commit where it branched off. Buildkite exports that commit to every
PR step as `GITHUB_PR_MERGE_BASE`, and to every merge-queue step as `MERGE_QUEUE_MERGE_BASE`:

```ts
const base = process.env.GITHUB_PR_MERGE_BASE;
git(['cat-file', '-e', `${base}:./settings_contract.snapshot.json`]); // absent at base: skip
const baseSnapshot = git(['show', `${base}:./settings_contract.snapshot.json`]); // failure: throw
```

PR and merge-queue builds fail loudly if their merge base is missing or not in the checkout, and a
git failure on a file that exists throws, so the check cannot switch itself off. Other CI builds
(on-merge builds of `main`, where the base is the commit itself) skip it. Locally it uses the
nearest remote default branch, and is skipped if there is none. It takes effect once the snapshot
exists on `main`.

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
| 1. Breaking changes cannot ship by mistake | The contract test classifies every change. Update mode refuses a breaking one without an accepted issue. Validation the contract cannot compare fails explicitly and cannot be accepted. The base-branch comparison keeps a deleted-and-regenerated snapshot red. CODEOWNERS routes `fixtures/`, `test_helpers/` and `worker_settings_compat.test.ts` to `@elastic/alertzero-common-layer`; once that team has write access to the repository, an accepted breaking change needs its review |
| 2. Does not depend on documentation | The tests fire on the change itself, and each message names the next command |
| 3. Customers are never affected | The guard is unit tests only. Test helpers and snapshots live in `test_helpers/`, which the distributable build excludes. The one runtime change renders stored settings through the same upgrade the read path applies, never writes a stored document without a user request, and never raises autonomy |
| 4. Adding a setting never strands configured Workers | The read path and every renderer fill a missing key from its default, so a Worker bound to a service account runs the new setting after the version bump re-renders it. An added field with a default, including a boolean or an array, produces only a `[safe]` line |
| 5. Clear for Watch teams | The plugin README has a "Changing Worker settings safely" section with a change-kind table. Every failure line is labelled `[safe]` or `[breaking]` |
| 6. Future cases are caught | The snapshot is compared field by field, so any removal, retype, tightened bound or narrowed enum is caught without a hand-kept list. A narrowed autonomy level is reported with the level stored documents are moved to. Unknown schema features fail loudly |
| 7. No reliance on remembering fixtures | The snapshot is generated from the declarations. A new field needs no fixture. A new Worker without fixtures fails with a message naming the files to add |

## What a Watch team does

**Add a setting.** Add the field to the schema YAML and run `yarn openapi:generate`, then add a
default in `worker_settings_defaults.ts`:

```ts
export const RULE_TUNING_WORKER_SETTINGS_DEFAULTS = {
  allowedAutonomyLevels: REVIEW_GATED_AUTONOMY_LEVELS,
  scheduleInterval: { defaultValue: '2h' },
  extras: {
    defaultValue: { analysisWindowDays: 7, fpCountThreshold: 10, fpRateThresholdPct: 50, maxGaps: 3 },
  },
} as const satisfies WorkerSettingsDefaults;
```

Use it in the YAML and bump the definition version. CI then reports
`[safe] added …extras.maxGaps with a default`; run update mode and push. After the upgrade,
`ready()` re-renders every configured space with `maxGaps: 3`, the settings page shows 3, and values
a space already stores stay as they are. No stored document is rewritten.

**Change a default.** Reported as `[safe]`. Bump the definition version, which the fingerprint row
asks for, and run update mode. The
new default reaches fresh installs and every space that does not store the field; a stored value
wins.

**Edit only the YAML (a prompt, a step).** The settings classification does not fire. Bump the
definition version, as `main` already requires. Nothing in the settings guard changes.

**Remove an allowed autonomy level.** When a lower allowed level remains, for example Attack
Discovery moving from `manual`/`supervised` to `manual`/`assisted`, CI reports
`[safe] removed supervised … A stored supervised is read and rendered as assisted`. Bump the
definition version (the fingerprint row asks for it) and run update mode; configured spaces run
at the lower level once `ready()`
re-renders them. Removing the lowest allowed level is breaking.

**Rename, remove or retype a field, tighten a bound.** Reported as
`[breaking]`. Prefer keeping the stored key and changing only the label. Otherwise, before
customers, agree a reset on an issue and accept it in update mode. After that, only a migration.

**Add a Worker.** Add `fixtures/<worker_id_in_snake_case>/current.json` with the settings a
configured space would store, then run update mode. The contract test reports `[safe] added Worker …`.

## What the Common Worker Layer team does

- Owns the guard and extends the classifier when a new schema feature appears.
- Reviews snapshot changes and every accepted breaking change.
- Decides breaking changes: label-only fix, reset (before customers), or migration.
- Builds the migration flow ([security-team#19312](https://github.com/elastic/security-team/issues/19312)),
  which replaces the accept flag and the settings-version tripwire test.

## Limitations and follow-ups

- **Validation JSON Schema cannot express fails the build rather than being compared.** The OpenAPI
  generator emits the `nonempty` and `date-math` formats as `.superRefine`; a settings field using
  one would stop the contract until the constraint is rewritten or the contract learns it. No
  settings field uses them today.
- **Outside the contract:** the rest of the save request (`enabled`, `settingsRevision`) and the
  rules the Workers service adds on save, such as requiring a service account to enable a Worker.
- **Rendered workflow content is not asserted.** If real incidents show a setting stopped reaching
  the workflow input it is meant for, the owning Watch team can add a targeted test for that
  setting. Generic content rules should become mandatory only with an agreed ownership boundary and
  an exception process.
- **Scheduled tasks are not re-synced by a re-render.** A trigger that depends on the level, or a
  new schedule, changes on the next save or enable in each space.
- **`ready()` re-renders at most 1000 managed workflow documents across spaces**, a platform limit
  every definition upgrade has. Documents past it pick changes up on their next save.
- **Stored documents are not healed.** They keep their old shape until the next save; the read path
  and the renderer interpret them. A platform hook that lets a managed definition upgrade its own
  stored values at boot would need the Workflows team and a security review, and would call the same
  upgrade function.
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
