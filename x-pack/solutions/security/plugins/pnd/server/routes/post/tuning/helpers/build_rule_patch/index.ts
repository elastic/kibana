/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_TUNABLE_RULE_FIELDS } from '@kbn/pnd-common';

/**
 * The two ways a tuning body may name the rule to patch. Not rule *changes*, so they are exempt from
 * the tunable-field allow-list while still being forwarded to the detection-engine route.
 */
export const PND_RULE_IDENTIFIER_FIELDS = ['id', 'rule_id'] as const;

/** A rule patch ready to send to `PATCH /api/detection_engine/rules`. */
export type RulePatch = Record<string, unknown>;

/**
 * An `ApplyTuningRequestBody` as it reaches the route. The whole body is taken, not just the fields
 * the contract names, so a field a future schema edit widens by accident is still *visible* here and
 * can be reported instead of silently dropped.
 */
export type BuildRulePatchParams = {
  /** The proposed change, as `ApplyTuningRequestBody.change`. */
  change?: Record<string, unknown>;
  /** PND audit metadata, not a detection-rule field, so it never reaches the patch. */
  rationale?: string;
} & RulePatch;

export interface BuildRulePatchResult {
  /** Tunable fields the patch actually changes. Empty means there is nothing to apply. */
  changedFields: string[];
  /**
   * The body for `PATCH /api/detection_engine/rules`: the rule identifier (`id` or `rule_id`) plus
   * the changed fields, **flat**. The detection-engine route takes rule fields at the top level, so
   * a nested `change` object would be stripped by its own validation and the rule would come back
   * unmodified with a `200` — a silent no-op reported as an applied tuning.
   *
   * A field outside the allow-list is never written here, so it cannot reach the detection engine
   * even if a caller ignores {@link BuildRulePatchResult.rejectedFields}.
   */
  patch: RulePatch;
  /**
   * Field names outside `PND_TUNABLE_RULE_FIELDS`, wherever they arrived — inside `change` or
   * smuggled in at the body's top level. Non-empty means the caller proposed a change PND refuses
   * to make, which is a `400` rather than a partially-applied patch.
   */
  rejectedFields: string[];
}

const isRuleIdentifierField = (field: string): boolean =>
  (PND_RULE_IDENTIFIER_FIELDS as readonly string[]).includes(field);

const isTunableField = (field: string): boolean =>
  (PND_TUNABLE_RULE_FIELDS as readonly string[]).includes(field);

/**
 * The fields of a rule patch that PND refuses to write — the server-side half of B6a's three-layer
 * guard, and the layer that actually enforces the boundary.
 *
 * The other two layers are contracts: `draft_tuning`'s output schema stops the model proposing an
 * unsafe field, and `ApplyTuningRequestBody.change` closes the object so validation strips one. This
 * layer exists because **the schema is the contract but the route is the boundary, and the model is
 * not the only caller**: it also catches a field a future schema edit widens by accident, and it
 * turns a stripped field into a visible `400` instead of a `200` that applied less than it claimed.
 *
 * `PND_TUNABLE_RULE_FIELDS` is `enabled` / `investigation_fields` / `note` / `query`. A query rewrite
 * is the single likeliest thing a model proposes when asked to tune a noisy rule, and it is applied
 * here because a reviewer can now judge it: the watch backtests the current and the proposed query
 * over one shared window, and the approval surfaces render the diff beside both counts. This helper
 * still cannot check the one precondition a `query` patch has — the rule's `type` must be `query` —
 * because the rule is not in hand; the route re-fetches it and refuses any other type as the same
 * field-naming `400`.
 *
 * Alert suppression and `threshold` stay out: they change how alerts de-duplicate and group rather
 * than which documents match, so a count measured either side of the change does not describe what
 * the change did, and there is nothing for a reviewer to judge. `exceptions_list` stays out for a
 * reason of its own that no review flow fixes: a rule patch **replaces** that array rather than
 * merging it, so an LLM-authored value would silently detach every exception list already attached
 * to the rule.
 */
export const findDisallowedRulePatchFields = (patch: RulePatch): string[] =>
  Object.keys(patch).filter((field) => !isRuleIdentifierField(field) && !isTunableField(field));

/**
 * Turns an approved tuning into the detection-rule patch that applies it — and names anything it
 * refuses to apply.
 *
 * `change` is a nested object in PND's own contract (it is the reviewable unit an analyst approves),
 * but `PATCH /api/detection_engine/rules` takes rule fields at the top level — so a body forwarded
 * verbatim would send a literal `change` key and silently change nothing. `rationale` is PND audit
 * metadata, not a rule field, so it is dropped here rather than forwarded.
 *
 * Everything else the body carries is *kept in view*: a field outside `PND_TUNABLE_RULE_FIELDS` is
 * reported in {@link BuildRulePatchResult.rejectedFields} — never quietly discarded — because a
 * caller has to be told that the change it authorized is not the change that would be made. See
 * {@link findDisallowedRulePatchFields} for why the set is exactly these four fields.
 *
 * A change with no tunable field in it is reported as `changedFields: []` rather than built into a
 * patch that would identify a rule and change nothing.
 */
export const buildRulePatch = ({
  change,
  rationale: _rationale,
  ...identifiers
}: BuildRulePatchParams): BuildRulePatchResult => {
  // `change` spread last: the approved change wins over a same-named field at the body's top level.
  const flattened: RulePatch = { ...identifiers, ...change };
  // A field the caller left unset is not a change, so it is neither patched nor rejected.
  const presentFields = Object.keys(flattened).filter((field) => flattened[field] != null);

  return {
    changedFields: presentFields.filter(isTunableField),
    patch: Object.fromEntries(
      presentFields
        .filter((field) => isRuleIdentifierField(field) || isTunableField(field))
        .map((field) => [field, flattened[field]])
    ),
    rejectedFields: findDisallowedRulePatchFields(
      Object.fromEntries(presentFields.map((field) => [field, flattened[field]]))
    ),
  };
};
