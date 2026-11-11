# Decision rules

Decide on the issue passed in (the `target` in the `context` JSON). Use its title, type, labels, body and comments. If it has sub-issues, decide on the whole: its body plus the titles, types and labels in `descendants`.

Apply the rules **in this order** and stop at the first one that matches. Quote the rule ID in the answer.

| Order | ID | Matches when | Decision |
|---|---|---|---|
| 1 | N1 | It is a bug: type `Bug`, a `bug` label, `[Bug]` in the title, or a body that reports broken behavior (steps, current vs expected) | No |
| 2 | N3 | The issue is itself the testing work: "Test plan for …", "Create test plan", upgrade testing, a manual test pass | No |
| 3 | A1 | Not enough to decide: the body is empty or one line, and neither it nor the sub-issue titles say what changes for users | Need your input: ask what the issue changes |
| 4 | N5 | It only adds, flips or removes a feature flag; the behavior behind the flag is tracked elsewhere | No |
| 5 | N2 | It is not a functionality: refactor, technical debt, telemetry, CI, automated test coverage (Scout, Cypress, Jest), cleanup, dependency bump, CODEOWNERS, docs or a docs request, research, spike, "discuss", design-only work | No |
| 6 | A3 | Internal performance or reliability work with no behavior change users can see (batching, refresh policy, caching) | Need your input: ask whether there is a user-visible change to test |
| 7 | S1 / S2 / S3 | It is a functionality (see below) | Go to the granularity check |
| 8 | A4 | Nothing above matches, or two rules point different ways | Need your input: say which rules conflict |

## Functionality (S1, S2, S3)

- **S1:** changes how the product behaves for users or for other systems: UI, flow, navigation, setting, public API, or backend behavior such as a parser, a translation or detection logic. Backend-only work counts; "functionality" does not mean "has UI".
- **S2:** changes stored data: mappings, saved object types, index contents, or a migration of existing data.
- **S3:** raises or removes a limit users run into (page size caps, item counts per object) with a visible change in behavior.

## Granularity check (only for S1, S2, S3)

| ID | Matches when | Decision |
|---|---|---|
| N4 | The issue has a parent, and it is one small element of a feature the ancestors describe: one field, one control, one part of a header, styling or copy. Usually three acceptance criteria or fewer and no flow of its own. | No. Suggest a level with `hierarchy.md`. |
| A2 | Same smallness, but the issue has **no** parent | Need your input: ask whether this change gets its own plan or is covered elsewhere |
| — | Otherwise | Yes, with the S rule that matched |

**Not a slice:** a sub-issue with its own entry point and end-to-end flow (for example a new row action that opens a panel, runs something and confirms it), or one that changes stored data. These are a Yes even under a parent.

## Examples

| Issue shape | Rule | Decision |
|---|---|---|
| New row action that opens a panel, runs a workflow and shows a toast; 4 ACs | S1 | Yes |
| Bug report with steps to reproduce | N1 | No |
| "Test plan for the native Dashboards migration" sub-issue | N3 | No |
| Title only, empty body ("Dashboard Studio 2.0 support") | A1 | Ask |
| "Feature flag for the native Dashboards migration" | N5 | No |
| "Add Scout coverage for the new flyout" | N2 | No |
| "Install managed workflows with `_bulk`, one refresh per chunk" | A3 | Ask |
| Saved object for case templates plus migration of existing cases | S2 | Yes |
| Bulk assign beyond the 100-alert page limit | S3 | Yes |
| "Show severity in the flyout header", 2 ACs, five levels down an epic | N4 | No, suggest an ancestor |
| "Link the attack name to the schedule flyout", 2 ACs, no parent | A2 | Ask |
| Epic with a vague body whose sub-issues are features | S1 | Yes |
| Epic whose sub-issues are only bugs and tests | N1 / N2 | No |
