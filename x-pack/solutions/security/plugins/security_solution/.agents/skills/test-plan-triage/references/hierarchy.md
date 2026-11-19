# Picking the level for a test plan

`ancestors` in the `context` JSON lists every parent from the nearest (index 0) to the root (last). Each one has its title, type, state, labels, a body excerpt, `has_test_plan`, and `children` (its direct sub-issues; `on_chain: true` marks the one on the path to the target). It holds up to 50 parents (past that, `context` fails): walk the whole list.

An entry with `unreadable: true` is a parent the user's `gh` cannot read (private repo, deleted, no access). It has only `ref`, and the script stopped climbing there.

`test-plan-generator`, run on an issue, reads all of its sub-issues recursively (its `references/gathering-context.md`). So one plan high in the chain covers everything below it, and a second plan lower in the same chain would overlap it. The goal is the **highest ancestor that is still one functionality**.

## Steps

1. Start at the target. Go up one ancestor at a time.
2. At each ancestor, ask: is it still one functionality that contains the target's? Use its title, body excerpt and `children`.
   - **One functionality:** its children are parts of the same feature (entry points, header, tabs, API and UI of the same thing). Keep climbing.
   - **Umbrella:** stop, and do not suggest it or anything above it. Signals:
     - The title is a bucket: "milestones", "Meta Task", "GA tasks", "tasks before GA", "phases", a release or version, "roadmap", "tracking".
     - The type is `Initiative`, or the body only says it tracks other work.
     - Its `children` are different functionalities that would each get their own plan (for example EQL support, notes, pinned events and flyouts under one parent).
   - **Not a functionality:** the ancestor itself matches N1 or N2 in `rules.md` (for example a "Tech debt" or "Bug fixes" epic whose other children are refactors and bugs). Stop, and do not suggest it or anything above it.
   - **Unclear:** stop climbing. The decision becomes Need your input (A4), whatever the target's own rule (a Yes, an N3 or an N4): show the whole chain, say which rule the target matched, and ask which level they want. Propose no label and no comment until they answer.
   - **Unreadable:** stop climbing. You cannot tell what it is, so never suggest it; say the chain continues above it and that you could not read it.
3. The suggested level is the last ancestor you reached before stopping. If you stopped at the first ancestor, there is no suggested level: the target stands on its own.
4. Adjust for state:
   - A **closed** ancestor is never suggested. If the one you reached is closed, suggest the highest **open** one-functionality ancestor below it, and mention the closed one.
   - An ancestor with `has_label: true` is reported as "already labeled", with no label change.
   - An ancestor with `has_test_plan: true` is reported as "test plan already published".
   - An ancestor with `allowed_repo: false` cannot be labeled; mention it and suggest nothing there.
   - An ancestor with `private: true` can be the suggested level, but when the target is not private, the No comment must not link or describe it (SKILL.md step 5).
5. Never suggest or label descendants of the target.

## What goes in the answer

| Target decision | Suggested level | Proposed label changes |
|---|---|---|
| Yes | none | the target |
| Yes | an ancestor | only the ancestor; say its plan covers the target, so labeling both would make two overlapping plans |
| No (N4) | an ancestor | only the ancestor |
| A small slice with no suggested level (the parent is already an umbrella, not a functionality, closed or unreadable) | none | none; this is A2, not N4: answer Need your input, record nothing, and ask whether the target gets its own plan or is covered elsewhere |
| No (N3, the issue is the testing work) | an ancestor | only the ancestor: the plan belongs to the work being tested |
| No (N3) with no suggested level (the parent is an umbrella, not a functionality, closed or unreadable) | none | none; the decision stays No, because the testing work never needs its own plan. Write `none — ` and the reason, for example `none — the parent is an umbrella` |
| Need your input | any | none until the question is answered |

In **Hierarchy**, show every ancestor from the root down to the target, mark umbrellas with "(umbrella)", ancestors that are not a functionality with "(not a functionality)", closed ones with "(closed)", labeled ones with "(labeled)", and unreadable ones with "(unreadable)".

## Example

Chain from root to target: "milestones" (children: flyouts, EQL support, notes, pinned events, templates, entry points) › "Security flyouts in Discover" › "document flyouts" › "alert/event document flyout" › "alert header" › "severity in the header" (target, 2 ACs).

- Target: N4, a slice.
- Climbing: "alert header", "alert/event document flyout", "document flyouts" and "Security flyouts in Discover" are all parts of the flyouts feature.
- "milestones" is an umbrella: its children are unrelated functionalities. Stop.
- Suggested level: "Security flyouts in Discover". Proposed change: add the label there only.
