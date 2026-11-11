# Picking the level for a test plan

`ancestors` in the `context` JSON lists every parent from the nearest (index 0) to the root (last). Each one has its title, type, state, labels, a body excerpt, `has_test_plan`, and `children` (its direct sub-issues; `on_chain: true` marks the one on the path to the target). There is no depth limit: walk the whole list.

`test-plan-generator`, run on an issue, reads all of its sub-issues recursively. So one plan high in the chain covers the small slices below it. The goal is the **highest ancestor that is still one functionality**.

## Steps

1. Start at the target. Go up one ancestor at a time.
2. At each ancestor, ask: is it still one functionality that contains the target's? Use its title, body excerpt and `children`.
   - **One functionality:** its children are parts of the same feature (entry points, header, tabs, API and UI of the same thing). Keep climbing.
   - **Umbrella:** stop, and do not suggest it or anything above it. Signals:
     - The title is a bucket: "milestones", "Meta Task", "GA tasks", "tasks before GA", "phases", a release or version, "roadmap", "tracking".
     - The type is `Initiative`, or the body only says it tracks other work.
     - Its `children` are different functionalities that would each get their own plan (for example EQL support, notes, pinned events and flyouts under one parent).
   - **Unclear:** stop climbing, show the whole chain, and ask the user which level they want (rule A4).
3. The suggested level is the last ancestor you reached before stopping. If you stopped at the first ancestor, there is no suggested level: the target stands on its own.
4. Adjust for state:
   - A **closed** ancestor is never suggested. If the one you reached is closed, suggest the highest **open** one-functionality ancestor below it, and mention the closed one.
   - An ancestor with `has_label: true` is reported as "already labeled", with no label change.
   - An ancestor with `has_test_plan: true` is reported as "test plan already published".
   - An ancestor with `allowed_repo: false` cannot be labeled; mention it and suggest nothing there.
5. Never suggest or label descendants of the target.

## What goes in the answer

| Target decision | Suggested level | Proposed label changes |
|---|---|---|
| Yes | none | the target |
| Yes | an ancestor | the target, and the ancestor as a separate line the user may approve or not |
| No (N4) | an ancestor | only the ancestor |
| No (N4) | none (the parent is already an umbrella) | none; say the slice has no level to attach to and ask whether the target should get its own plan after all |
| No (N3, the issue is the testing work) | an ancestor | only the ancestor: the plan belongs to the work being tested |
| No (N1, N2, N5) | any | none; a bug, a chore or a flag says nothing about whether its parent needs a plan |
| Need your input | any | none until the question is answered |

In **Hierarchy**, show every ancestor from the root down to the target, mark umbrellas with "(umbrella)", closed ones with "(closed)", and labeled ones with "(labeled)".

## Example

Chain from root to target: "milestones" (children: flyouts, EQL support, notes, pinned events, templates, entry points) › "Security flyouts in Discover" › "document flyouts" › "alert/event document flyout" › "alert header" › "severity in the header" (target, 2 ACs).

- Target: N4, a slice.
- Climbing: "alert header", "alert/event document flyout", "document flyouts" and "Security flyouts in Discover" are all parts of the flyouts feature.
- "milestones" is an umbrella: its children are unrelated functionalities. Stop.
- Suggested level: "Security flyouts in Discover". Proposed change: add the label there only.
