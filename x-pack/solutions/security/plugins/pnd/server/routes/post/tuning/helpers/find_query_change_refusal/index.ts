/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';

import { fetchDetectionRule } from '../../../../helpers/fetch_detection_rule';

/** The one rule type a `query` patch means anything on. */
export const QUERY_RULE_TYPE = 'query';

export interface FindQueryChangeRefusalParams {
  /** Tunable fields the patch changes, as `buildRulePatch` reports them. */
  changedFields: readonly string[];
  /** Core's HTTP start contract, source of the self client. */
  http: HttpServiceStart;
  /** The rule's saved-object `id`, when the body carried one; `undefined` for a `rule_id`-only body. */
  id: string | undefined;
  /** The approving user's request; the rules read runs as this identity (security finding S3). */
  request: KibanaRequest;
  /** Space resolved from the request (security finding S9); never a client value. */
  spaceId: string;
}

/**
 * The reason `_apply` refuses a `query` patch, or `undefined` when the patch may proceed.
 *
 * `query` is a tunable field, but unlike the other three it has a precondition the request cannot
 * carry: it only means anything on a rule whose `type` is `query`. `PATCH /api/detection_engine/rules`
 * does not reject a `query` on an `eql` or `machine_learning` rule — it ignores it and answers `200`,
 * so PND would report `applied: true` for a rule whose detection logic never moved. That is the same
 * silent no-op `buildRulePatch` flattens the change to avoid, arriving by a different route.
 *
 * So the rule is **re-fetched** here, as the approving user, and anything other than a `query` rule
 * comes back as a `400` naming the field — the same shape a field outside
 * `PND_TUNABLE_RULE_FIELDS` gets from `findDisallowedRulePatchFields`.
 *
 * Fail-closed twice over, because an unconfirmed type is not a confirmed one:
 *
 * - A body that identifies the rule only by `rule_id` is refused: the read is by saved-object `id`,
 *   and PND's own surfaces always carry `id` (the drafting step copies it from the candidate-rule
 *   menu), so the alternative identifier reaches here only from a caller that is not the review flow.
 * - A read that returns any non-2xx is refused. It is *not* reported as a 404 or a 403: whether the
 *   rule exists is exactly what the candidate-rules route declines to disclose, and a refusal that
 *   varied by status would restore that oracle.
 *
 * The read is skipped entirely when the patch does not change `query`, so the common tuning
 * (`enabled` / `investigation_fields` / `note`) still costs no extra self-call.
 */
export const findQueryChangeRefusal = async ({
  changedFields,
  http,
  id,
  request,
  spaceId,
}: FindQueryChangeRefusalParams): Promise<string | undefined> => {
  if (!changedFields.includes(QUERY_RULE_TYPE)) {
    return undefined;
  }

  if (id == null) {
    return 'Tuning may not change query without confirming the rule\'s type; identify the rule by "id"';
  }

  const { rule } = await fetchDetectionRule({ http, id, request, spaceId });

  if (rule == null) {
    return "Tuning may not change query: the rule's type could not be read";
  }

  if (rule.type !== QUERY_RULE_TYPE) {
    // `type` is `unknown` on the rules API's own document, so a rule that carries no readable type
    // is described as unreadable rather than rendered as the string "undefined".
    const ruleType = typeof rule.type === 'string' ? rule.type : 'unknown';

    return `Tuning may not change query on a rule of type "${ruleType}"; a query change applies only to a rule whose type is "${QUERY_RULE_TYPE}"`;
  }

  return undefined;
};
