/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { SYNTHETICS_API_URLS } from '../../../common/constants/synthetics/rest_api';
import { INITIAL_REST_VERSION } from '../../../common/constants/ui';
import type { MonitorAttachmentData } from '../../../common/agent_builder';

/**
 * The synthetics monitor CRUD route returns one of two shapes:
 *
 * 1. **Clean success** — a `SyntheticsMonitorWithId` (the saved monitor
 *    fields, plus top-level `id`, `created_at`, `updated_at`).
 * 2. **Partial-failure** — `ServiceLocationErrorsResponse`: the monitor
 *    saved-object **was** created, but one or more locations failed to
 *    start. The shape is `{ attributes: { message, errors, id? } }`. The
 *    `attributes.id` is set when the SO landed; absent only when the
 *    request never made it past pre-write validation, in which case
 *    `http.post` throws before this code runs.
 *
 * We deliberately keep these types narrow / local instead of importing
 * the runtime-types codec — the SPA's exported codec brings several
 * megabytes of decoder graph along with it, and the two fields we care
 * about (`id` for `updateOrigin`, location warnings for the UI callout)
 * are stable across versions.
 */
interface UpsertMonitorSuccessResponse {
  id: string;
}

interface ServiceLocationErrorEntry {
  locationId: string;
  error?: { message: string };
}

interface ServiceLocationErrorsResponse {
  attributes: {
    message: string;
    errors: ServiceLocationErrorEntry[];
    id?: string;
  };
}

type UpsertMonitorResponse = UpsertMonitorSuccessResponse | ServiceLocationErrorsResponse;

const isPartialFailureResponse = (
  response: UpsertMonitorResponse
): response is ServiceLocationErrorsResponse =>
  typeof response === 'object' && response !== null && 'attributes' in response;

export interface MonitorLocationWarning {
  locationId: string;
  message: string;
}

export interface MonitorSaveOutcome {
  /** Saved-object id of the created / updated monitor. Used for `updateOrigin`. */
  id: string;
  /** Per-location warnings. Empty when the save was fully clean. */
  locationWarnings: MonitorLocationWarning[];
}

export class MonitorSaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MonitorSaveError';
  }
}

const narrowSaveResponse = (response: UpsertMonitorResponse): MonitorSaveOutcome => {
  if (isPartialFailureResponse(response)) {
    if (!response.attributes.id) {
      throw new MonitorSaveError(response.attributes.message);
    }
    return {
      id: response.attributes.id,
      locationWarnings: response.attributes.errors.map((entry) => ({
        locationId: entry.locationId,
        message: entry.error?.message ?? 'Unknown location error',
      })),
    };
  }
  return { id: response.id, locationWarnings: [] };
};

/**
 * Pulls the most specific error message available out of an
 * `IHttpFetchError`. Kibana's browser HTTP client throws errors whose
 * `.message` is just the HTTP status text (e.g. `Bad Request`) — the
 * actual server-side validation reason lives on `error.body.message`
 * with structured details under `error.body.attributes` for the
 * synthetics monitor route. Without this extraction the user sees a
 * useless `Bad Request` callout when, e.g., a required field is
 * missing or a location id doesn't exist.
 *
 * Defensive: never throws on unexpected shapes; falls back to the
 * generic `error.message`. Always emits the full error to the console
 * (single line, structured) so a developer doing manual smoke can grab
 * the raw validation payload without opening DevTools' network tab.
 */
const extractServerErrorMessage = (error: unknown, op: 'create' | 'update'): string => {
  if (error == null || typeof error !== 'object') {
    return String(error);
  }
  const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
  const body = (error as { body?: unknown }).body;
  if (body == null || typeof body !== 'object') {
    return fallbackMessage;
  }
  // eslint-disable-next-line no-console
  console.error(`[synthetics × agent_builder] ${op} failed:`, error, 'body:', body);
  const bodyMessage = (body as { message?: unknown }).message;
  const attributes = (body as { attributes?: unknown }).attributes;
  const attributesMessage =
    attributes && typeof attributes === 'object'
      ? (attributes as { message?: unknown }).message
      : undefined;
  if (typeof attributesMessage === 'string' && attributesMessage.length > 0) {
    return attributesMessage;
  }
  if (typeof bodyMessage === 'string' && bodyMessage.length > 0) {
    return bodyMessage;
  }
  return fallbackMessage;
};

/**
 * POST `/api/synthetics/monitors` with the user's session.
 *
 * The body is the current `MonitorAttachmentData`. The server runs
 * `normalizeAPIConfig` → `validateMonitor`, which fills in `DEFAULT_FIELDS`
 * and rejects malformed payloads — so the client doesn't need to mirror
 * those defaults.
 *
 * Secrets are sent **plaintext** in the JSON body, mirroring the
 * monitor form's existing behaviour. The server's `formatSecrets`
 * picks the secret keys (`PASSWORD`, `PARAMS`, `PROXY_HEADERS`, …),
 * encrypts them, and stores them in the `secrets` blob.
 */
export const createMonitor = async (
  http: HttpStart,
  monitor: MonitorAttachmentData
): Promise<MonitorSaveOutcome> => {
  try {
    const response = await http.post<UpsertMonitorResponse>(
      SYNTHETICS_API_URLS.SYNTHETICS_MONITORS,
      {
        body: JSON.stringify(monitor),
        version: INITIAL_REST_VERSION,
        query: { internal: true },
      }
    );
    return narrowSaveResponse(response);
  } catch (error) {
    throw new MonitorSaveError(extractServerErrorMessage(error, 'create'));
  }
};

/**
 * PUT `/api/synthetics/monitors/{configId}` with the user's session.
 *
 * Same body / versioning rules as `createMonitor`. The full attachment
 * payload is sent — the server's normalizer is idempotent for unchanged
 * fields, so re-saving without modifications is a no-op write.
 */
export const updateMonitor = async (
  http: HttpStart,
  configId: string,
  monitor: MonitorAttachmentData
): Promise<MonitorSaveOutcome> => {
  try {
    const response = await http.put<UpsertMonitorResponse>(
      `${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/${encodeURIComponent(configId)}`,
      {
        body: JSON.stringify(monitor),
        version: INITIAL_REST_VERSION,
        query: { internal: true },
      }
    );
    return narrowSaveResponse(response);
  } catch (error) {
    throw new MonitorSaveError(extractServerErrorMessage(error, 'update'));
  }
};

/**
 * Builds the in-app URL to a saved monitor's details page. The caller
 * is responsible for `application.navigateToUrl(...)`-ing the result.
 *
 * `appPath` should come from `application.getUrlForApp('synthetics')`,
 * which already includes the basePath.
 */
export const getMonitorDetailsUrl = (configId: string, appPath: string): string =>
  `${appPath}/monitor/${encodeURIComponent(configId)}`;
