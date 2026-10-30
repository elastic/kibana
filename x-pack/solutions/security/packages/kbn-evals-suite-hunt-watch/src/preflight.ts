/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { type EvalConnector } from '@kbn/evals';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import {
  ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  ALERTZERO_ENABLED_SETTING_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
  ALERTZERO_WORKERS_URL,
  API_VERSIONS,
  buildWorkerUrl,
  buildSecurityRoleUrl,
  getWorkerRoleName,
  HUNT_THREAT_INTEL_SUPPLY_URL,
  SECURITY_ROLE_API_VERSION,
  SECURITY_SERVICE_ACCOUNT_URL,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  WORKER_SERVICE_ACCOUNT_NAMES,
  type HuntThreatIntelSupplyStatus,
} from '@kbn/alertzero-common';
import {
  DEFAULT_EVAL_SPACE_ID,
  EVAL_SPACE_IDS,
  HUNT_A_SPACE_ID,
  HUNT_B_SPACE_ID,
  HUNT_BLOCKED_INDEX_PATTERN,
  HUNT_BLOCKED_SPACE_ID,
  PUBLIC_API_VERSION,
} from './constants';
import { ensureJudgeConnectorAccessible, type ListWorkersResponse } from './workflow_fixture';
import { ensureEntityStoreRunning } from './entity_store';
import { apiVersion, errorMessage, httpStatus, spacePath } from './kibana_api';

/** `securitySolution:defaultIndex` — not exported from a package, so inlined (mirrors
 * `DEFAULT_INDEX_KEY` in `security_solution/common/constants.ts`). */
const DEFAULT_INDEX_SETTING_ID = 'securitySolution:defaultIndex';

/** `search_inference_endpoints` plugin's internal API version — not exported from a package
 * (the plugin's route constants live in `server/`, not `common/`), so inlined. Not the same
 * plugin as `@kbn/alertzero-common`'s `API_VERSIONS`, so not borrowed from there even though
 * both happen to be `'1'` today. */
const SEARCH_INFERENCE_ENDPOINTS_API_VERSION = '1';

const NON_DEFAULT_EVAL_SPACE_IDS = EVAL_SPACE_IDS.filter((id) => id !== DEFAULT_EVAL_SPACE_ID);

const ALERTZERO_TIER_FEATURE_IDS: readonly string[] = [
  ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
];

const ensureSpaceExists = async ({
  fetch,
  log,
  spaceId,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  spaceId: string;
}): Promise<void> => {
  const exists = await fetch(`/api/spaces/space/${encodeURIComponent(spaceId)}`, {
    method: 'GET',
    headers: apiVersion(PUBLIC_API_VERSION),
  })
    .then(() => true)
    .catch((err) => {
      if (httpStatus(err) !== 404) throw err;
      return false;
    });
  if (exists) return;

  log.info(`[hunt-watch] creating eval space "${spaceId}"`);
  await fetch('/api/spaces/space', {
    method: 'POST',
    headers: apiVersion(PUBLIC_API_VERSION),
    body: JSON.stringify({
      id: spaceId,
      name: spaceId,
      description: 'Eval-only space created by the hunt-watch suite preflight fixture.',
      disabledFeatures: [],
    }),
  });
};

interface UiSettingsGetResponse {
  settings: Record<string, { userValue?: unknown }>;
}

const getUiSetting = async <T>({
  fetch,
  spaceId,
  key,
}: {
  fetch: HttpHandler;
  spaceId: string;
  key: string;
}): Promise<T | undefined> => {
  const response = await fetch<UiSettingsGetResponse>(
    spacePath(spaceId, '/internal/kibana/settings'),
    { method: 'GET' }
  );
  return response.settings[key]?.userValue as T | undefined;
};

const setUiSettings = async ({
  fetch,
  spaceId,
  changes,
}: {
  fetch: HttpHandler;
  spaceId: string;
  changes: Record<string, unknown>;
}): Promise<void> => {
  await fetch(spacePath(spaceId, '/internal/kibana/settings'), {
    method: 'POST',
    body: JSON.stringify({ changes }),
  });
};

/**
 * Enables AlertZero per eval space and sets each space's hunt index scope: `hunt-a`/`hunt-b`
 * copy the default space's `securitySolution:defaultIndex` so their scope is `ok`/`degraded`
 * (not `blocked:empty_universe`), while `hunt-blocked` is pointed at a pattern that resolves to
 * nothing to induce the blocked path on purpose.
 */
const configureIndexScope = async ({
  fetch,
  log,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<void> => {
  const defaultIndex = await getUiSetting<string[]>({
    fetch,
    spaceId: DEFAULT_EVAL_SPACE_ID,
    key: DEFAULT_INDEX_SETTING_ID,
  });

  for (const spaceId of EVAL_SPACE_IDS) {
    const changes: Record<string, unknown> = { [ALERTZERO_ENABLED_SETTING_ID]: true };
    if (spaceId === HUNT_BLOCKED_SPACE_ID) {
      changes[DEFAULT_INDEX_SETTING_ID] = [HUNT_BLOCKED_INDEX_PATTERN];
    } else if (
      (spaceId === HUNT_A_SPACE_ID || spaceId === HUNT_B_SPACE_ID) &&
      defaultIndex &&
      defaultIndex.length > 0
    ) {
      changes[DEFAULT_INDEX_SETTING_ID] = defaultIndex;
    }
    log.info(
      `[hunt-watch] configuring index scope for space "${spaceId}": ${JSON.stringify(changes)}`
    );
    await setUiSettings({ fetch, spaceId, changes });
  }
};

/**
 * Bridges the subject model into the Worker: sets `genAiSettings:defaultAIConnector` to the
 * subject connector id in each eval space, then asserts no `alertzero_*` tier inference feature
 * has an endpoint assigned. `scoped_model.ts` resolves the Worker's model from tier endpoints
 * first — if one is assigned, the connector set here is silently ignored and every weekly run
 * tests whatever model that tier endpoint points at instead of the six subject models under
 * test. Fails loud rather than lying about which model actually ran.
 */
const bridgeSubjectModel = async ({
  fetch,
  log,
  connectorId,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  connectorId: string;
}): Promise<Map<string, string | null>> => {
  // Checked in every space before anything is written: a throw here must not leave the spaces
  // already visited pointed at the subject connector with no cleanup to put them back.
  // `/internal/search_inference_endpoints/settings` reports which inference endpoint (if any)
  // is assigned per feature id; a non-empty `endpoints` array for a tier feature means that
  // tier takes precedence over the genAiSettings bridge below.
  for (const spaceId of EVAL_SPACE_IDS) {
    const settingsResponse = await fetch<{
      data: { features: Array<{ feature_id: string; endpoints: Array<{ id: string }> }> };
    }>(spacePath(spaceId, '/internal/search_inference_endpoints/settings'), {
      method: 'GET',
      headers: apiVersion(SEARCH_INFERENCE_ENDPOINTS_API_VERSION),
    });

    const assignedTierFeatures = settingsResponse.data.features.filter(
      (feature) =>
        ALERTZERO_TIER_FEATURE_IDS.includes(feature.feature_id) && feature.endpoints.length > 0
    );
    if (assignedTierFeatures.length > 0) {
      throw new Error(
        `[hunt-watch] space "${spaceId}" has a tier inference endpoint assigned for ` +
          `${assignedTierFeatures.map((f) => f.feature_id).join(', ')}. Tier endpoints take ` +
          `precedence over "genAiSettings:defaultAIConnector" in scoped_model.ts, so the Worker ` +
          `would silently ignore the subject connector this suite bridges. Unassign the tier ` +
          `endpoint(s) in this deployment before running this suite. A per-tier bridge is a follow-up.`
      );
    }
  }

  const previous = new Map<string, string | null>();
  for (const spaceId of EVAL_SPACE_IDS) {
    // Remembered so the cleanup can put the space back the way it was. The Worker stays enabled
    // in every eval space between runs, and on a long-lived stack the default space is the
    // developer's own: clearing the connector there would leave their Worker with no model.
    previous.set(
      spaceId,
      (await getUiSetting<string>({ fetch, spaceId, key: GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR })) ??
        null
    );
    log.info(
      `[hunt-watch] setting genAiSettings:defaultAIConnector="${connectorId}" in space "${spaceId}"`
    );
    await setUiSettings({
      fetch,
      spaceId,
      changes: { [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: connectorId },
    });
  }
  return previous;
};

interface ServiceAccountEntry {
  id: string;
  name: string;
  enabled: boolean;
  assumable: boolean;
}

interface ListServiceAccountsResponse {
  serviceAccounts: ServiceAccountEntry[];
  nextPage?: string;
}

const SERVICE_ACCOUNT_LIST_PAGE_SIZE = 100;

const listServiceAccounts = async (fetch: HttpHandler): Promise<ServiceAccountEntry[]> => {
  const accounts: ServiceAccountEntry[] = [];
  let after: string | undefined;
  do {
    const page = await fetch<ListServiceAccountsResponse>(SECURITY_SERVICE_ACCOUNT_URL, {
      method: 'GET',
      query: { limit: SERVICE_ACCOUNT_LIST_PAGE_SIZE, ...(after ? { after } : {}) },
    });
    accounts.push(...page.serviceAccounts);
    after = page.nextPage;
  } while (after);
  return accounts;
};

/** The suite runs on the stateful Scout stack, where the Worker role is an ES reserved role. */
const IS_SERVERLESS = false;

/**
 * Requires the Worker's built-in role to exist in this deployment. AlertZero no longer creates
 * Worker roles: stateful ships them as Elasticsearch reserved roles, so an ES snapshot without
 * them refuses to enable the Worker, and the suite should say so by name.
 */
const findBuiltInWorkerRole = async (fetch: HttpHandler, accountName: string): Promise<string> => {
  const roleName = getWorkerRoleName(accountName, { isServerless: IS_SERVERLESS });
  const missing = () =>
    new Error(
      `[hunt-watch] Elasticsearch has no built-in "${roleName}" role for the Worker. ` +
        `The ES snapshot must be at least as new as the Kibana under test.`
    );
  let role: { metadata?: { _reserved?: unknown } };
  try {
    role = await fetch(buildSecurityRoleUrl(roleName), {
      method: 'GET',
      headers: apiVersion(SECURITY_ROLE_API_VERSION),
    });
  } catch (err) {
    throw httpStatus(err) === 404 ? missing() : err;
  }
  if (role.metadata?._reserved !== true) throw missing();
  return roleName;
};

/**
 * Mirrors `ensureWorkerServiceAccounts` in `alertzero/public/service_accounts`: finds or creates
 * the Worker's service account with its built-in role, the same way the Worker settings panel
 * does before a human enables a Worker from the UI. Enabling a Worker without one is refused with
 * "Cannot apply a worker that is enabled without a service account" (`workers_service.ts`).
 */
const ensureWorkerServiceAccount = async ({
  fetch,
  log,
  workerId,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  workerId: string;
}): Promise<string> => {
  const name = WORKER_SERVICE_ACCOUNT_NAMES[workerId];
  if (!name) {
    throw new Error(`[hunt-watch] no service account name for worker "${workerId}"`);
  }

  log.info(`[hunt-watch] ensuring service account "${name}" for worker "${workerId}"`);

  const existing = (await listServiceAccounts(fetch)).find((account) => account.name === name);
  if (existing) {
    if (!existing.enabled || !existing.assumable) {
      throw new Error(
        `[hunt-watch] service account "${name}" exists but is not usable ` +
          `(enabled=${existing.enabled}, assumable=${existing.assumable})`
      );
    }
    return existing.id;
  }

  const roleName = await findBuiltInWorkerRole(fetch, name);
  try {
    const created = await fetch<{ id: string }>(SECURITY_SERVICE_ACCOUNT_URL, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: `Eval-only service account for the hunt-watch suite's "${workerId}" worker.`,
        roles: [roleName],
      }),
    });
    return created.id;
  } catch (err) {
    if (httpStatus(err) !== 409) throw err;
    // Created concurrently (e.g. a previous run against this same long-lived stack).
    const concurrent = (await listServiceAccounts(fetch)).find((account) => account.name === name);
    if (!concurrent) throw err;
    return concurrent.id;
  }
};

/**
 * Enables the Worker in each eval space. Must run after {@link bridgeSubjectModel}: the Worker
 * refuses to enable with `noModel` when no AI model is resolvable in the space.
 */
const enableWorkerInEvalSpaces = async ({
  fetch,
  log,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<void> => {
  const serviceAccountId = await ensureWorkerServiceAccount({
    fetch,
    log,
    workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  });

  for (const spaceId of EVAL_SPACE_IDS) {
    log.info(
      `[hunt-watch] enabling Worker "${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}" in space "${spaceId}"`
    );

    const listed = await fetch<ListWorkersResponse>(spacePath(spaceId, ALERTZERO_WORKERS_URL), {
      method: 'GET',
      headers: apiVersion(API_VERSIONS.internal.v1),
    });
    const current = listed.workers.find(
      (w) => w.id === SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID
    );

    try {
      await fetch(
        spacePath(spaceId, buildWorkerUrl(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID)),
        {
          method: 'PATCH',
          headers: apiVersion(API_VERSIONS.internal.v1),
          body: JSON.stringify({
            enabled: true,
            settings: { serviceAccountId },
            settingsRevision: current?.settingsRevision ?? null,
          }),
        }
      );
    } catch (err) {
      throw new Error(
        `[hunt-watch] failed to enable the Worker in space "${spaceId}". If the error names ` +
          `"noModel" / "no AI model is available", the subject-model bridge ` +
          `(genAiSettings:defaultAIConnector) must run before this step. Original error: ${errorMessage(
            err
          )}`
      );
    }
  }
};

/** Requires `huntEnabled`, `hardGate.ok`, and no `drift` in every eval space. */
const assertThreatIntelSupplyReady = async ({
  fetch,
  log,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<void> => {
  for (const spaceId of EVAL_SPACE_IDS) {
    const status = await fetch<HuntThreatIntelSupplyStatus>(
      spacePath(spaceId, HUNT_THREAT_INTEL_SUPPLY_URL),
      { method: 'GET', headers: apiVersion(API_VERSIONS.internal.v1) }
    );

    if (!status.huntEnabled || !status.hardGate.ok || status.drift) {
      const missing = status.workflows.filter((w) => !w.installed || !w.enabled);
      throw new Error(
        `[hunt-watch] TI supply is not ready in space "${spaceId}" (huntEnabled=` +
          `${status.huntEnabled}, hardGate.ok=${status.hardGate.ok}, drift=${status.drift}). ` +
          `hardGate.reasonCodes=[${status.hardGate.reasonCodes.join(', ')}]${
            missing.length > 0
              ? `; missing/disabled workflows: ${missing.map((w) => w.key).join(', ')}`
              : ''
          }`
      );
    }
    log.info(`[hunt-watch] TI supply ready in space "${spaceId}"`);
  }
};

export type PreflightCleanup = () => Promise<void>;

/**
 * Worker-scoped `auto: true` fixture logic: makes the stack capable of running the Worker
 * before any example runs, failing loud with the named missing gate rather than letting a
 * misconfigured stack silently score zeros.
 *
 * Ordering is load-bearing: (1) spaces must exist before anything is configured in them;
 * (2) index scope before the Worker is enabled (resolveHuntScope reads it); (3) the subject-model
 * bridge before Worker enablement (enabling without a model throws `noModel`); (4) TI supply and
 * Entity Store are independent readiness checks that can run after enablement.
 */
export const runPreflight = async ({
  fetch,
  log,
  connectorId,
  evaluationConnector,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  connectorId: string;
  evaluationConnector: EvalConnector;
}): Promise<PreflightCleanup> => {
  for (const spaceId of NON_DEFAULT_EVAL_SPACE_IDS) {
    await ensureSpaceExists({ fetch, log, spaceId });
  }
  await configureIndexScope({ fetch, log });
  const previousConnectors = await bridgeSubjectModel({ fetch, log, connectorId });

  // The eval spaces are left in place on purpose. Deleting them here and recreating them on the
  // next run races the per-space Worker install, its service-account binding and the managed
  // workflow reconcile (seen as a 404 on the TI supply route and a 403 "service account binding
  // does not match" on the next run against a long-lived stack). They are eval-only and
  // `ensureSpaceExists` is idempotent, so a CI stack discards them and a local one reuses them.
  const restoreConnectors: PreflightCleanup = async () => {
    for (const spaceId of EVAL_SPACE_IDS) {
      try {
        await setUiSettings({
          fetch,
          spaceId,
          changes: {
            [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: previousConnectors.get(spaceId) ?? null,
          },
        });
      } catch (err) {
        log.warning(
          `[hunt-watch] failed to restore genAiSettings:defaultAIConnector in space "${spaceId}": ${errorMessage(
            err
          )}`
        );
      }
    }
  };

  // Every gate below can throw, and a worker fixture that throws before `use()` never runs the
  // cleanup it would have returned, so the connectors are put back here before the error leaves.
  try {
    await enableWorkerInEvalSpaces({ fetch, log });
    await assertThreatIntelSupplyReady({ fetch, log });
    await ensureEntityStoreRunning({ fetch, log });
    await ensureJudgeConnectorAccessible({ fetch, connector: evaluationConnector, log });
  } catch (err) {
    await restoreConnectors();
    throw err;
  }

  return restoreConnectors;
};
