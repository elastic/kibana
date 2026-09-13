/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared helpers for Detection Engine v2 routes.
 *
 * Centralises:
 *   - The API base path constant.
 *   - The `alerting:v2:enabled` 503 gate that every route handler must run.
 *   - The Alerting v2 error envelope builder (maps Boom errors → { code, error,
 *     message, details? }) so every route returns the same wire shape.
 *
 * This module is intentionally side-effect-free so it can be imported from
 * tests without Kibana booting.
 *
 * Ref: rule-crud-api.md "Conventions every endpoint shares"
 */

import Boom from '@hapi/boom';
import type { IKibanaResponse, IUiSettingsClient, KibanaResponseFactory } from '@kbn/core/server';
import { ALERTING_ERROR_CODES } from '@kbn/alerting-v2-plugin/server';
import type { ErrorResponse } from '@kbn/alerting-v2-schemas';

// ---------------------------------------------------------------------------
// Path constants
// ---------------------------------------------------------------------------

/** Root of every Detection Engine v2 API path. */
export const DETECTION_ENGINE_V2_BASE_PATH = '/api/detection_engine/v2';

/** Rules collection path. */
export const DETECTION_ENGINE_V2_RULES_PATH = `${DETECTION_ENGINE_V2_BASE_PATH}/rules`;

/** Single rule path. */
export const DETECTION_ENGINE_V2_RULE_PATH = `${DETECTION_ENGINE_V2_RULES_PATH}/{id}`;

/** Tags aggregation path. */
export const DETECTION_ENGINE_V2_TAGS_PATH = `${DETECTION_ENGINE_V2_BASE_PATH}/tags`;

/** UI setting key for the alerting v2 kill switch. */
export const ALERTING_V2_ENABLED_SETTING = 'alerting:v2:enabled';

// ---------------------------------------------------------------------------
// 503 gate
// ---------------------------------------------------------------------------

/**
 * Mirrors the framework's `assertAlertingEnabled` check.
 *
 * Every Detection Engine v2 route calls this before any other work. The
 * framework's own check lives in its route base class, so in-process rules-
 * client calls bypass it. Running the same check here means the Detections
 * API never writes rules into a deployment where v2 alerting is switched off.
 *
 * Throws a Boom `serverUnavailable` with code `ALERTING_DISABLED` when the
 * setting is off (or unset, which defaults to `false`).
 *
 * Ref: rule-crud-api.md "Conventions every endpoint shares"
 *      base_alerting_route.ts "assertAlertingEnabled"
 */
export async function assertAlertingEnabled(uiSettings: IUiSettingsClient): Promise<void> {
  const enabled = await uiSettings.get<boolean>(ALERTING_V2_ENABLED_SETTING);
  if (!enabled) {
    throw Boom.serverUnavailable('Alerting is disabled.', {
      code: ALERTING_ERROR_CODES.ALERTING_DISABLED,
    });
  }
}

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------

/**
 * Data attached to Boom errors thrown by the detection client and the 503 gate.
 * Matches what the alerting_v2 base route reads as `AlertingBoomData`.
 */
interface DetectionBoomData {
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Default fallback: HTTP status code → machine-readable error code.
 * Domain-specific codes set on the Boom error via `{ code }` data are preferred
 * — this is the floor for errors that arrive without one.
 *
 * Mirrors `deriveErrorCodeFromStatus` from the framework routes.
 */
const deriveErrorCodeFromStatus = (statusCode: number): string => {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
    503: 'SERVICE_UNAVAILABLE',
  };
  return (
    map[statusCode] ??
    (statusCode >= 400 && statusCode < 500 ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR')
  );
};

/**
 * Converts any error to the Alerting v2 `{ code, error, message, details? }` envelope
 * and returns the appropriate `KibanaResponseFactory` response.
 *
 * Non-Boom errors are boomified first. Framework codes carried on the Boom
 * error's `.data.code` property are passed through unchanged; status codes
 * without a domain code fall back to `deriveErrorCodeFromStatus`.
 *
 * `bypassErrorFormat: true` is required so Kibana core does not rebuild the
 * response from the raw Boom envelope, which would strip `code` and `details`.
 *
 * Ref: rule-crud-api.md "Conventions every endpoint shares"
 *      base_alerting_route.ts "onError"
 */
export function toErrorResponse(e: unknown, response: KibanaResponseFactory): IKibanaResponse {
  const boom = Boom.isBoom(e) ? e : Boom.boomify(e instanceof Error ? e : new Error(String(e)));

  const data = (boom.data ?? undefined) as DetectionBoomData | undefined;
  const code = data?.code ?? deriveErrorCodeFromStatus(boom.output.statusCode);
  const payload = boom.output.payload;

  const body: ErrorResponse = {
    code,
    error: payload.error,
    message: payload.message,
    ...(data?.details ? { details: data.details } : {}),
  };

  return response.customError({
    statusCode: boom.output.statusCode,
    body,
    bypassErrorFormat: true,
  });
}
