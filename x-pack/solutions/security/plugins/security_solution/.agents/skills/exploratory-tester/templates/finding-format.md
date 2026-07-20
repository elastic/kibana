# Finding Format

## File header

Write once at the top of each `findings-flow-<N>.md` file, before the first finding:

```markdown
<!-- flow: <flow name> | started: <ISO> | ended: <ISO> | duration: <Xm Ys> -->
```

## Level 1 / 2 finding

```markdown
## Finding: [short descriptive title]

**Level:** <1 | 2 | 3>
**Flow:** <flow name from config.json>
**Role:** <resolved_role from config.json>
**Checklist step:** <N — step description>

### Steps followed
1. <exact action — literal, not a summary>
2. <exact action>

### Current behavior
<what actually happened — include error messages verbatim, HTTP status codes, console output>

### Expected behavior
<what should have happened — derive from the first source that covers this behavior:
(1) `config.json → specs` — if the user provided a PRD or acceptance criteria, cite it explicitly
    (e.g. "Per spec at <url>: ..."). This is the authoritative source.
(2) `config.json → specs_fallback` (official docs) — if no specs, or specs are silent on this point.
    Cite the specific doc URL and section.
(3) `config.json → flows[N].expected` — the expected outcome stated in the flow definition.
(4) UI copy — labels, tooltips, help text visible in the product.
(5) Test files — intended user flows only, never selectors.
Never read source code or component internals — the implementation may be incorrect.
Never write "expected behavior unknown" — if none of the above apply, use (4) or (5) and say so.>

### Why this might be an issue
<mandatory for Level 1 and 2: commit to reasoning, explain user impact>

### Evidence
- Screenshot: `$SESSION_DIR/screenshots/<area_slug>-flow<N>-step<M>-<checklist-step-slug>.png`
- Console: `<relevant line>` — relevant = appeared after the action AND contains error/exception
  keywords or HTTP 5xx; ignore CSP violations, 404s on `/internal/cloud/solution`, browser extensions
- Network: <METHOD> `<path>` → <status> `<relevant response snippet>`
- Video: `$SESSION_DIR/videos/findings-flow-<N>.mp4` (or `- Video: unavailable (<reason>)` — see `scripts/record-evidence.md`)
```

## Level 3 observation (short format)

```markdown
## Observation: [title]

**Level:** 3
**Flow:** <flow name>
**Role:** <resolved_role>
**Checklist step:** <N — description>

### Current behavior
<what was observed>

### Evidence
- Console: `<line>`
```

## Level rules

| Level | Trigger | Agent action |
|---|---|---|
| **1** | JS exception in console; HTTP 5xx on any in-flow request; 2xx response body contains `error` key; error/failure toast; React "Maximum update depth exceeded"; behavior contradicts `config.json` `expected` field | Agent decides: confirmed bug |
| **2** | Unexpected 4xx; element that should be present is missing; layout visibly broken; action completes with no feedback; loading indicator unresolved after 10 s; any React DevTools warning (other than max depth); same API endpoint called 2+ times for one user action | Agent flags: user decides |
| **3** | `console.warn`; transient spinner; unclassifiable observation | Listed, not flagged |
