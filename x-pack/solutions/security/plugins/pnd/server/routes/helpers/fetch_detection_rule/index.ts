/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';

import { scopedSelfGet } from '../../get/conversations/helpers/scoped_self_get';

/**
 * Public detection-engine rules API path and version. Hardcoded rather than imported from the
 * security_solution `common/constants` barrel, which would pull a very large module into this
 * plugin — the path and version are a stable public contract. `patchDetectionRule` restates the
 * same two literals for the same reason; they are deliberately *not* shared, because a single
 * constant would tie the read path's version negotiation to the write path's.
 */
export const DETECTION_ENGINE_RULES_PATH = '/api/detection_engine/rules';
export const DETECTION_ENGINE_RULES_API_VERSION = '2023-10-31';

/**
 * As much of a detection rule as PND reads. Every field is optional and typed `unknown` where the
 * shape is not PND's to pin: this is the rules API's document, not a PND contract, and a projection
 * that assumed a field's type would throw on a rule type that carries a different one (a
 * `machine_learning` rule has no `query`, an `esql` rule has no `index`).
 *
 * The index signature is part of that honesty rather than a convenience: the real document carries
 * `actions`, `exceptions_list`, `meta` and the rest of the rule body, and naming only the twelve
 * fields PND projects would let a caller believe the others are absent.
 */
export interface DetectionRuleDocument {
  [field: string]: unknown;
  from?: unknown;
  id?: unknown;
  index?: unknown;
  interval?: unknown;
  language?: unknown;
  name?: unknown;
  query?: unknown;
  risk_score?: unknown;
  rule_id?: unknown;
  severity?: unknown;
  to?: unknown;
  type?: unknown;
}

/** Result of the scoped rules-API read: the rule document (2xx only) and the HTTP status. */
export interface FetchDetectionRuleResult {
  /** The rule as the detection-engine route returned it; `undefined` for any non-2xx. */
  rule: DetectionRuleDocument | undefined;
  /** HTTP status code returned by the detection-engine route. */
  status: number;
}

export interface FetchDetectionRuleParams {
  /** Core's HTTP start contract, source of the self client. */
  http: HttpServiceStart;
  /** The rule's **saved-object** id — `kibana.alert.rule.uuid` on an alert, never the `rule_id`. */
  id: string;
  /** The incoming request; the read runs as this identity (security finding S3). */
  request: KibanaRequest;
  /** Space resolved from the request (security finding S9); never a client value. */
  spaceId: string;
}

/**
 * Read one detection rule by saved-object id from `GET /api/detection_engine/rules` **as the calling
 * user** (security finding S3, decision D7).
 *
 * A rule the caller cannot read comes back as a non-2xx `status` with no `rule`, which callers turn
 * into an *absence* rather than an error: the candidate-rules menu simply omits it, so the route
 * cannot be used to probe which rules exist. That is the same non-observability
 * `findAttackDiscoveryAlerts` gives the discovery ids.
 *
 * Shared from `routes/helpers` rather than scoped to the candidate-rules route because `_apply` has
 * the same read to make — it must confirm a rule's `type` before proposing a `query` change against
 * it — and a rules read that exists in two copies is a scoping decision that will diverge.
 */
export const fetchDetectionRule = async ({
  http,
  id,
  request,
  spaceId,
}: FetchDetectionRuleParams): Promise<FetchDetectionRuleResult> => {
  const { body, status } = await scopedSelfGet<DetectionRuleDocument>({
    http,
    path: DETECTION_ENGINE_RULES_PATH,
    query: { id },
    request,
    spaceId,
    version: DETECTION_ENGINE_RULES_API_VERSION,
  });

  return { rule: body, status };
};
