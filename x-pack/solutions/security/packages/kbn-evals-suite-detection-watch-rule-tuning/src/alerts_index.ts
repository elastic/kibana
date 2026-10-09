/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ALERTS_INDEX,
  ALERTS_WORKFLOW_TAGS_FIELD,
  DETECTION_ENGINE_INDEX_API_PATH,
} from './constants';

/**
 * Whether the alerts index can be seeded into, and why not when it cannot.
 *
 * The three ways it can be unready are operationally different and must not be
 * collapsed into one "index missing" message:
 *   - not created yet (`indexExists: false`): the security solution has not
 *     bootstrapped its rule-data namespace, and it still will — waiting fixes it.
 *   - created without the unified-alerts mapping (`plainIndex: true`): ES
 *     auto-created a plain index under the alias' name because something wrote
 *     to it first. The alerting framework can no longer install its own index
 *     under that name, so the stack stays broken until the index is deleted.
 *   - created, mapped, but this field is absent: mapping drift.
 */
export interface AlertsIndexState {
  fieldMapped: boolean;
  indexExists: boolean;
  plainIndex: boolean;
  evidence: string;
}

const asFieldCaps = (
  response: unknown
): { indices?: Array<{ name?: string }>; fields?: Record<string, unknown> } =>
  (response ?? {}) as { indices?: Array<{ name?: string }>; fields?: Record<string, unknown> };

/**
 * Is `ALERTS_INDEX` an alias (the healthy shape: one hidden backing index created
 * by the alerting framework) or a concrete index ES auto-created from a bulk write?
 *
 * `GET /_alias/<name>` only resolves aliases, so a 404 for a name that
 * `_field_caps` just listed means "index exists, alias does not".
 */
const isAliased = async (esClient: EsClient): Promise<boolean> => {
  try {
    const response = (await esClient.indices.getAlias({ name: ALERTS_INDEX })) as Record<
      string,
      { aliases?: Record<string, unknown> }
    >;
    return Object.values(response ?? {}).some((entry) => Boolean(entry?.aliases?.[ALERTS_INDEX]));
  } catch (error) {
    return false;
  }
};

export const readAlertsIndexState = async ({
  esClient,
}: {
  esClient: EsClient;
}): Promise<AlertsIndexState> => {
  const fieldCaps = asFieldCaps(
    await esClient.fieldCaps({
      index: ALERTS_INDEX,
      fields: [ALERTS_WORKFLOW_TAGS_FIELD],
      ignore_unavailable: true,
    })
  );

  const indexExists = (fieldCaps.indices?.length ?? 0) > 0;
  const fieldMapped = Boolean(fieldCaps.fields?.[ALERTS_WORKFLOW_TAGS_FIELD]);
  const plainIndex = indexExists && !fieldMapped ? !(await isAliased(esClient)) : false;

  if (fieldMapped) {
    return {
      fieldMapped,
      indexExists,
      plainIndex,
      evidence: `${ALERTS_INDEX} carries ${ALERTS_WORKFLOW_TAGS_FIELD}`,
    };
  }

  if (!indexExists) {
    return {
      fieldMapped,
      indexExists,
      plainIndex,
      evidence: `${ALERTS_INDEX} does not exist yet`,
    };
  }

  return {
    fieldMapped,
    indexExists,
    plainIndex,
    evidence: plainIndex
      ? `${ALERTS_INDEX} is a plain, dynamically-mapped index with no alerting-framework alias`
      : `${ALERTS_INDEX} exists but does not map ${ALERTS_WORKFLOW_TAGS_FIELD}`,
  };
};

/**
 * Ask the security solution to install/refresh the alerts index
 * (`POST /api/detection_engine/index`).
 *
 * On a stack whose legacy `.siem-signals-*` bootstrap index exists this also
 * installs the alerts index template; where it does not, the route is a no-op
 * and the poll below is what waits for the alerting framework instead. A
 * failure here is logged, never thrown: the index can still appear on its own,
 * and the timeout path reports the whole story.
 */
export const requestAlertsIndexBootstrap = async ({
  fetch,
  log,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<number | undefined> => {
  try {
    const response = await fetch<unknown>(DETECTION_ENGINE_INDEX_API_PATH, {
      method: 'POST',
      headers: { 'kbn-xsrf': 'true' },
      asResponse: true,
    });
    const status = response.response?.status;
    log.debug(`POST ${DETECTION_ENGINE_INDEX_API_PATH} → ${status ?? 'no response'}`);
    return status;
  } catch (error) {
    log.warning(
      `POST ${DETECTION_ENGINE_INDEX_API_PATH} failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
};

const poisonedIndexError = (state: AlertsIndexState): Error =>
  new Error(
    `Alerts index is poisoned: ${state.evidence}. A bulk write reached ${ALERTS_INDEX} before ` +
      `the alerting framework created its own index under that name, so ES auto-created a ` +
      `dynamically-mapped one and the framework can never install its alias now. Seeding into it ` +
      `would make the worker's harvest step fail with ` +
      `"verification_exception: Unknown column [${ALERTS_WORKFLOW_TAGS_FIELD}]", which the sweep ` +
      `reports as harvest_failed: true with 0 reviews — indistinguishable from "nothing to tune". ` +
      `Remedy: delete the index (DELETE ${ALERTS_INDEX}) and restart Kibana, or run against a ` +
      `freshly installed stack.`
  );

const notReadyError = (
  state: AlertsIndexState,
  timeoutMs: number,
  bootstrapStatus?: number
): Error =>
  new Error(
    `Alerts index is not ready after ${timeoutMs}ms: ${state.evidence}${
      bootstrapStatus !== undefined
        ? ` (POST ${DETECTION_ENGINE_INDEX_API_PATH} → ${bootstrapStatus})`
        : ` (POST ${DETECTION_ENGINE_INDEX_API_PATH} did not answer)`
    }. The security solution bootstraps its rule-data namespace asynchronously after Kibana ` +
      `reports ready, so seeding now would write into an unmapped index and every harvest of ` +
      `this run would fail with "verification_exception: Unknown column ` +
      `[${ALERTS_WORKFLOW_TAGS_FIELD}]" while still reporting a completed sweep.`
  );

const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Block until the alerts index carries the unified-alerts mapping, so the seed
 * cannot win the race against the security solution's index bootstrap.
 *
 * Call this from a spec's `beforeAll` *before* any seeding: a run that starts
 * first otherwise creates a plain, dynamically-mapped index under the alias'
 * name and poisons the stack for every later run.
 */
export const ensureAlertsIndexReady = async ({
  fetch,
  esClient,
  log,
  timeoutMs = 300_000,
  pollIntervalMs = 5_000,
}: {
  fetch: HttpHandler;
  esClient: EsClient;
  log: ToolingLog;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<AlertsIndexState> => {
  const startedAt = Date.now();
  let state = await readAlertsIndexState({ esClient });

  if (state.fieldMapped) {
    log.info(`Alerts index ready: ${state.evidence}`);
    return state;
  }

  if (state.plainIndex) {
    throw poisonedIndexError(state);
  }

  log.warning(
    `Alerts index not ready (${state.evidence}) — requesting the security solution's index bootstrap`
  );
  const bootstrapStatus = await requestAlertsIndexBootstrap({ fetch, log });

  while (Date.now() - startedAt < timeoutMs) {
    await sleep(pollIntervalMs);
    state = await readAlertsIndexState({ esClient });
    if (state.fieldMapped) {
      log.info(`Alerts index ready after ${Date.now() - startedAt}ms: ${state.evidence}`);
      return state;
    }
    if (state.plainIndex) {
      throw poisonedIndexError(state);
    }
  }

  throw notReadyError(state, timeoutMs, bootstrapStatus);
};
