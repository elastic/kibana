# `investigate-rule` Brain Definition

This document is the source of truth for the skill's reasoning guide. The
`SKILL_CONTENT` constant in `investigate_rule_skill.ts` is derived from this
file. Edit here first; copy into the TypeScript constant when ready to ship.

---

## When to Use This Skill

Use this skill when the user asks why a detection rule is generating too many
alerts, why alerts seem like false positives, or how to reduce noise from the
rule — whether or not a rule attachment is already present:

- "Why is this rule firing so much?"
- "Most of these alerts seem like false positives."
- "How do I reduce noise from this rule?"
- "This host keeps triggering the rule but it's expected behavior."

Do **not** use this skill to create or edit the rule. Those intents belong to
the `detection-rule-edit` skill.

---

## Core Workflow

### Step 0: Ensure the Rule Attachment Exists

Before reading the attachment, check whether a `security.rule` attachment is
already present in the conversation.

- **Attachment present** (visible in the conversation sidebar, e.g. the user
  opened a rule from the Security UI or the `detection-rule-edit` skill created
  it): proceed to Step 1.
- **No attachment present** (the user referred to a rule by UUID, or selected
  one from a `find-rules` results table): call
  `investigate-rule.resolve_rule_attachment` with the rule UUID. This fetches the
  rule via Kibana's saved-objects layer and creates a `security.rule` attachment
  keyed on `rule-investigate-<uuid>`. Render the attachment inline using
  `<render_attachment id="..." version="..." />` after creation, then continue to
  Step 1.

### Step 1: Read the Rule Attachment

Always begin by calling `attachment_read` on the rule attachment. The attachment
contains the rule definition (query, index patterns, schedule, type, enabled
state, MITRE mappings). Never assume attachment contents; always read the latest
version.

Extract and retain: `rule_id` (or `id`), `name`, `type`, `language`, `query`,
`index`, `interval`, `from`, `enabled`.

### Step 2: Fetch Recent Alerts

Call `investigate-rule.get_rule_alerts` with the rule ID and
`time_window_hours: 24`. Extend to 72 or 168 if the user asks about a longer
period or the 24-hour sample is too small (fewer than 10 alerts).

### Step 3: Analyse the Alert Pattern

Examine the `top_entities` aggregation in the result. Recurring `host.name`,
`user.name`, or `source.ip` values that account for a disproportionate share
of alerts are the primary FP signal.

Cross-reference with Security Labs (`security_labs_search`) if the rule name
or MITRE technique is available. Known-good activity documented in Labs content
(admin tooling, expected automation) shifts classification toward **benign true
positive**, not a rule defect.

**Classify root cause:**

| Pattern observed | Root cause | Recommended action |
|---|---|---|
| One or two entities generating >= 70% of alerts | Benign activity from known entities | Add an exception for those entities via `tune-rule` |
| Alerts spread across many entities, query very broad | Overly broad query or missing index filter | Propose query refinement via `tune-rule` |
| Alert volume spikes during business hours only | Noisy but legitimate behavior | Add alert suppression rule via `tune-rule` |
| Threshold is too low for the environment baseline | Threshold misconfiguration | Propose threshold increase via `tune-rule` |
| No clear pattern | Insufficient data | Request a wider time window or manual review |

### Step 4: Produce Output

All output is either **informational** (diagnosis + explanation) or
**actionable** (a `proposed_changes` payload for `tune-rule`). Never apply
mutations directly. All write operations belong to `tune-rule`.

- Alert volume summary: total count, trend over the window, top entities.
- Root cause statement and classification (FP vs. benign TP vs. rule defect).
- `proposed_changes` payload for `tune-rule`:
  - Exception: entity values + field path.
  - Query refinement: proposed updated query with explanation.
  - Threshold: current vs. proposed value + estimated alert reduction.
- Include the estimated alert volume reduction where calculable.

---

## Referral Conditions

### Refer to `tune-rule`

Emit a `proposed_changes` payload when:

- A concrete, actionable fix has been identified (exception, query change,
  threshold change).
- The user has confirmed they want to proceed with the proposed change.

Never call mutation tools directly. The payload format is:

```json
{
  "rule_id": "<id from attachment>",
  "proposed_changes": {
    "<field>": "<new value>"
  },
  "rationale": "<one sentence explaining why>",
  "estimated_impact": "<e.g., estimated 80% alert reduction>"
}
```

### Refer to `detection-rule-edit`

Refer when the fix requires a substantive query rewrite (not a field-level
patch). `tune-rule` handles field patches; `detection-rule-edit` handles
authoring new query logic.

---

## Output Format

Always structure output as:

1. **Summary** (1-3 sentences): what the rule is doing and what the noise
   problem is, stated plainly.
2. **Evidence** (bulleted): the specific signals from the alert data that
   support the diagnosis.
3. **Root cause**: one clear statement.
4. **Recommended action**: what to do next, with a `proposed_changes` payload
   if a mutation is needed, or a referral if the fix belongs to another skill.

---

## Fallback

If the alert data is insufficient for a confident diagnosis:

1. Surface raw evidence: alert count, top entities, rule query and index
   patterns (from the attachment).
2. Provide a manual investigation checklist appropriate to the observed
   symptoms.
3. Do not emit a `proposed_changes` payload. State clearly: "I wasn't able to
   determine the root cause from available data. Here is the evidence for
   manual review."
