/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { SYNTHETICS_API_URLS } from '../../../common/constants/synthetics/rest_api';
import { INITIAL_REST_VERSION } from '../../../common/constants/ui';
import { ConfigKey } from '../../../common/runtime_types';
import type { MonitorAttachmentData } from '../../../common/agent_builder';

/**
 * The synthetics monitor CRUD route returns one of two shapes:
 *
 * 1. **Clean success** — a `SyntheticsMonitorWithId` (the saved monitor
 *    fields, plus top-level `id`, `created_at`, `updated_at`).
 * 2. **Partial-failure** — the SO **was** created/updated, but the push
 *    to the global Synthetics service failed for one or more
 *    Elastic-managed locations. The actual server shape is
 *    `{ message, attributes: { errors }, id? }` — `message` and `id`
 *    are at the **top level** (not nested under `attributes`), and
 *    `id` is present on create (the new SO id) but omitted on update
 *    (the caller already has the configId). Each entry of
 *    `attributes.errors` is `{ locationId, error?: { reason, status, … } }`.
 *
 * NOTE: The runtime-types codec
 * (`ServiceLocationErrorsResponse` in
 * `common/runtime_types/monitor_management/locations.ts`) declares the
 * shape as `{ attributes: { message, errors, id? } }` — but the actual
 * server in `add_monitor.ts` / `edit_monitor.ts` returns `message` and
 * `id` at the top level. The existing Synthetics SPA reads the actual
 * shape (see `apps/synthetics/components/getting_started/use_simple_monitor.ts`
 * for the precedent). We mirror that here, deliberately ignoring the
 * codec to avoid importing several megabytes of decoder graph for two
 * fields.
 *
 * `error?` is genuinely optional per entry: low-level network
 * failures (TLS cert expiry, DNS, connection refused) reach the
 * server-side `axios` `catchError` *before* `err.response` exists, so
 * the entry is `{ locationId, error: undefined }`. We surface the
 * location id with a generic message in that case.
 */
interface UpsertMonitorSuccessResponse {
  id: string;
}

interface ServiceLocationSyncErrorBody {
  reason?: string;
  status?: number;
}

interface ServiceLocationSyncError {
  locationId: string;
  error?: ServiceLocationSyncErrorBody;
}

interface ServiceLocationErrorsResponse {
  message?: string;
  attributes: { errors: ServiceLocationSyncError[] };
  id?: string;
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

/**
 * Format a per-location push error into a single human-readable string
 * for the warnings callout. Mirrors the shape of
 * `apps/synthetics/components/monitors_page/management/show_sync_errors.tsx`
 * but flattened to one line — the callout already provides the
 * `locationId` heading.
 */
const formatLocationErrorMessage = (error: ServiceLocationSyncError['error']): string => {
  if (error == null) {
    return 'Could not reach this location (no response from the synthetics service).';
  }
  const status = typeof error.status === 'number' ? `${error.status}` : null;
  const reason = typeof error.reason === 'string' && error.reason.length > 0 ? error.reason : null;
  if (status && reason) return `${status} — ${reason}`;
  if (reason) return reason;
  if (status) return `Status ${status}`;
  return 'Unknown location error';
};

/**
 * Narrow the upsert response into a `MonitorSaveOutcome`.
 *
 * `fallbackId` is used by `updateMonitor` to recover when the partial-
 * failure response omits the `id` (edits don't echo it back; the
 * caller already passed it in the URL path).
 */
const narrowSaveResponse = (
  response: UpsertMonitorResponse,
  fallbackId?: string
): MonitorSaveOutcome => {
  if (isPartialFailureResponse(response)) {
    const resolvedId = response.id ?? fallbackId;
    if (!resolvedId) {
      // No id anywhere — the SO write itself failed (validation,
      // permissions). Surface the top-level message verbatim.
      throw new MonitorSaveError(response.message ?? 'Save failed');
    }
    return {
      id: resolvedId,
      locationWarnings: response.attributes.errors.map((entry) => ({
        locationId: entry.locationId,
        message: formatLocationErrorMessage(entry.error),
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
 * Strip Saved-Object metadata / storage-only keys before sending the
 * attachment to the monitor CRUD endpoints. The server's
 * `normalizeAPIConfig` builds its allow-list from
 * `Object.keys(DEFAULT_FIELDS[type])` and rejects anything not on it
 * with `Invalid monitor key(s) for {type} type: …`.
 *
 * Three keys are present on attachment data after a Save (because
 * `mapSavedObjectToMonitor` copies them off the SO and our Zod schema
 * permits them so the same shape covers both proposed + saved
 * monitors), but **none** of them appear in `DEFAULT_FIELDS`:
 *
 * - `created_at`, `updated_at` — SO meta added by
 *   `mapSavedObjectToMonitor`. Pure read-only.
 * - `revision` — stored on the SO attributes (see
 *   `synthetics_monitor_config.ts`), bumped server-side on every
 *   write. Echoing it back as part of the request body trips the
 *   same validator.
 *
 * Echoing any of them produces a 400 from the route — observed in
 * manual smoke as a "Save failed — Invalid monitor key(s) for http
 * type: created_at | updated_at" callout right after a successful
 * Create followed by an Update via the canvas. Bug write-up: F15 in
 * `notes/01-monitor-management/followups.md`.
 *
 * Other server-managed keys (`config_id`, `monitor_query_id`,
 * `config_hash`) **are** in `DEFAULT_FIELDS` and the server is
 * idempotent on them, so they don't need stripping.
 */
const stripReadOnlyMonitorKeys = (monitor: MonitorAttachmentData): MonitorAttachmentData => {
  const {
    created_at: _createdAt,
    updated_at: _updatedAt,
    [ConfigKey.REVISION]: _revision,
    ...rest
  } = monitor;
  return rest as MonitorAttachmentData;
};

/**
 * POST `/api/synthetics/monitors` with the user's session.
 *
 * The body is the current `MonitorAttachmentData` minus read-only
 * keys (see {@link stripReadOnlyMonitorKeys}). The server runs
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
        body: JSON.stringify(stripReadOnlyMonitorKeys(monitor)),
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
 * Same body / versioning rules as `createMonitor`, including the
 * read-only-key strip. The full attachment payload is sent — the
 * server's normalizer is idempotent for unchanged fields, so
 * re-saving without modifications is a no-op write.
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
        body: JSON.stringify(stripReadOnlyMonitorKeys(monitor)),
        version: INITIAL_REST_VERSION,
        query: { internal: true },
      }
    );
    return narrowSaveResponse(response, configId);
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
