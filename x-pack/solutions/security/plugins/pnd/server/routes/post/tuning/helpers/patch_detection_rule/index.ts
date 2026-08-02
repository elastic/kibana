/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import { applySpacePrefix } from '@kbn/workflows';

/**
 * Public detection-engine rules API path and version. Hardcoded (rather than importing the
 * security_solution `common/constants` barrel, which would pull a very large module into this
 * plugin) — the path and version are a stable public contract.
 */
const DETECTION_ENGINE_RULES_PATH = '/api/detection_engine/rules';
const DETECTION_ENGINE_RULES_API_VERSION = '2023-10-31';

/** Result of the scoped `PATCH`: the HTTP status and the updated rule id when the call succeeded. */
export interface PatchDetectionRuleResult {
  /** `id` from the updated rule (2xx only); `undefined` for non-2xx or a body without an id. */
  ruleId: string | undefined;
  /** HTTP status code returned by the detection-engine route. */
  status: number;
}

export interface PatchDetectionRuleParams {
  /** The rule patch payload (identifies the rule by `id` or `rule_id`, plus the field changes). */
  body: Record<string, unknown>;
  /** Core's HTTP start contract, source of the self client. */
  http: HttpServiceStart;
  /** The approving user's request — the `PATCH` runs as this identity (security finding S2). */
  request: KibanaRequest;
  /** Space resolved from the request (security finding S9); prefixes the path for non-default spaces. */
  spaceId: string;
}

/**
 * Apply an approved detection-rule tuning by calling `PATCH /api/detection_engine/rules`
 * **as the approving user**, using Core's HTTP self client scoped to the incoming request
 * (security finding S2).
 *
 * This route exists to fix a confused deputy: the Task Manager API key that runs the Detection
 * Watch carries the *scheduling* user's privileges, and resuming a HITL gate does not re-key the
 * execution, so a `kibana.request` PATCH from the workflow would write as whoever closed the
 * incident, not as the engineer who approved the tuning. Forwarding the caller's identity makes the
 * identity that decided the identity that acts — and lets the detection-engine route enforce its own
 * authorization against that user.
 *
 * `rawResponse: true` short-circuits the self client's throw-on-non-2xx behaviour, so a `403`/`404`
 * from the target route is returned as a status the route can surface **visibly** rather than as an
 * exception. Genuine transport errors still reject and become a `500` at the caller.
 *
 * ⚠️ The patch is handed over as an **object**, never `JSON.stringify`d. Core's self client
 * (`serializeBody`, `core/packages/http/server-internal/src/self_client.ts`) returns a string body
 * untouched and sets `content-type` **only** for a non-string one — so a pre-serialized body arrives
 * at the target route unparsed, and the detection-engine route answers
 * `400 [request body]: Invalid input: expected object, received string`. Measured live on a 9.6.0
 * dev stack: with the string body every `_apply` failed that way; with the object it applies. The
 * workflows engine's own `callKibanaApi` passes the object for the same reason.
 */
export const patchDetectionRule = async ({
  body,
  http,
  request,
  spaceId,
}: PatchDetectionRuleParams): Promise<PatchDetectionRuleResult> => {
  const { response } = await http.selfClient
    .asScoped(request)
    .fetch<{ id?: string }>(applySpacePrefix(DETECTION_ENGINE_RULES_PATH, spaceId), {
      access: 'public',
      asResponse: true,
      // the object, not a JSON string — see the note above
      body,
      method: 'PATCH',
      prependBasePath: false,
      rawResponse: true,
      version: DETECTION_ENGINE_RULES_API_VERSION,
    });

  if (!response.ok) {
    return { ruleId: undefined, status: response.status };
  }

  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as { id?: string }) : undefined;
  return {
    ruleId: typeof parsed?.id === 'string' ? parsed.id : undefined,
    status: response.status,
  };
};
