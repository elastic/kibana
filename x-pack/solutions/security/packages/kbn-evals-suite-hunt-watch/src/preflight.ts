/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { type EvalConnector } from '@kbn/evals';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import {
  ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  ALERTZERO_ENABLED_SETTING_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
  ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID,
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

/** The same plugin's `APIRoutes.GET_INFERENCE_CONNECTORS`, inlined for the same reason. */
const INFERENCE_CONNECTORS_PATH = '/internal/search_inference_endpoints/connectors';

/** The same plugin's `APIRoutes.PUT_INFERENCE_SETTINGS`, inlined for the same reason. */
const INFERENCE_SETTINGS_PATH = '/internal/search_inference_endpoints/settings';

interface InferenceSettingsResponse {
  data: { features: Array<{ feature_id: string; endpoints: Array<{ id: string }> }> };
}

/** The three AlertZero cost tiers the connectors route can assert the subject on. */
const ALERTZERO_COST_TIER_FEATURE_IDS: readonly string[] = [
  ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
];

/**
 * Every feature the bridge pins through the inference-settings saved object. Includes the Cyber
 * row on top of the cost tiers: a saved Cyber pick replaces the tier in `selectHuntCallModel`,
 * so a pick left in place by an earlier run on a reused stack would score another model under
 * the subject's name while the tier assertions still pass. The Cyber row itself is registered
 * with `allowTemplateRequiredModels: true`, so the connectors route filters out every ordinary
 * connector for it and a normal subject resolves to nothing there; its pick is asserted from the
 * saved settings instead (`assertCyberPickPinned`).
 */
const ALERTZERO_BRIDGED_FEATURE_IDS: readonly string[] = [
  ...ALERTZERO_COST_TIER_FEATURE_IDS,
  ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID,
];

/** The `solution` view value AlertZero requires; any other value (or none) is a Classic space. */
const SECURITY_SOLUTION_VIEW = 'security';

interface SpaceBody {
  id: string;
  name: string;
  solution?: string;
  [field: string]: unknown;
}

/**
 * AlertZero routes 404 in a Classic space (`isSpaceSupported`), `default` included. The spaces
 * PUT replaces the whole object, so an existing space is written back as read. On serverless
 * the space is still created when missing, but without a `solution` and never converted.
 */
const ensureSecuritySpace = async ({
  fetch,
  log,
  spaceId,
  isServerless,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  spaceId: string;
  isServerless: boolean;
}): Promise<void> => {
  const existing = await fetch<SpaceBody>(`/api/spaces/space/${encodeURIComponent(spaceId)}`, {
    method: 'GET',
    headers: apiVersion(PUBLIC_API_VERSION),
  }).catch((err) => {
    if (httpStatus(err) !== 404) throw err;
    return undefined;
  });

  if (!existing) {
    log.info(`[hunt-watch] creating eval space "${spaceId}"`);
    await fetch('/api/spaces/space', {
      method: 'POST',
      headers: apiVersion(PUBLIC_API_VERSION),
      body: JSON.stringify({
        id: spaceId,
        name: spaceId,
        description: 'Eval-only space created by the hunt-watch suite preflight fixture.',
        disabledFeatures: [],
        // Serverless spaces have no solution view, so the field is omitted there.
        ...(isServerless ? {} : { solution: SECURITY_SOLUTION_VIEW }),
      }),
    });
    return;
  }

  // Serverless spaces have no `solution` field, so an existing one has nothing to convert.
  if (isServerless || existing.solution === SECURITY_SOLUTION_VIEW) return;

  // The conversion is never reverted, so it is only done on a disposable CI stack. On a
  // developer's long-lived stack it would silently change the `default` space's navigation.
  if (spaceId === DEFAULT_EVAL_SPACE_ID && process.env.CI?.toLowerCase() !== 'true') {
    throw new Error(
      `[hunt-watch] the "${spaceId}" space uses the "${
        existing.solution ?? 'classic'
      }" solution view, but AlertZero routes 404 outside a Security space. The suite only ` +
        `converts "${spaceId}" automatically when CI=true because the change is not ` +
        `reverted. Switch it to the Security solution view in Stack Management > Spaces, ` +
        `or run the suite on a throwaway stack.`
    );
  }

  log.info(
    `[hunt-watch] switching space "${spaceId}" from solution "${
      existing.solution ?? 'classic'
    }" to the Security solution view`
  );
  await fetch(`/api/spaces/space/${encodeURIComponent(spaceId)}`, {
    method: 'PUT',
    headers: apiVersion(PUBLIC_API_VERSION),
    body: JSON.stringify({ ...existing, id: spaceId, solution: SECURITY_SOLUTION_VIEW }),
  });
};

interface UiSettingsGetResponse {
  settings: Record<string, { userValue?: unknown }>;
}

const getUiSettings = async ({
  fetch,
  spaceId,
}: {
  fetch: HttpHandler;
  spaceId: string;
}): Promise<UiSettingsGetResponse['settings']> => {
  const response = await fetch<UiSettingsGetResponse>(
    spacePath(spaceId, '/internal/kibana/settings'),
    { method: 'GET' }
  );
  return response.settings;
};

const getUiSetting = async <T>({
  fetch,
  spaceId,
  key,
}: {
  fetch: HttpHandler;
  spaceId: string;
  key: string;
}): Promise<T | undefined> =>
  (await getUiSettings({ fetch, spaceId }))[key]?.userValue as T | undefined;

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

/** The settings the bridge overwrites, restored by the cleanup. */
const BRIDGED_SETTING_IDS = [
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
] as const;

/** Each bridged setting's user value per space before the bridge, `null` when it had none. */
type PreviousSettings = Map<string, Record<string, unknown>>;

/**
 * Each bridged tier's saved per-feature endpoint rows, keyed by space id: `null` when the space
 * had no `inference-settings` saved object at all. Restored by the cleanup.
 */
type PreviousTierPicks = Map<string, InferenceSettingsResponse['data'] | null>;

/**
 * Bridges the subject model into the Worker. The tier features register with
 * `ignoreGlobalDefault: true` and recommended endpoints, so `genAiSettings:defaultAIConnector`
 * alone never reaches a tier, and `genAiSettings:defaultAIConnectorOnly` cannot be used either:
 * it would 400-reject the judge's explicit connector calls in the default space. Instead each
 * bridged feature (the three tiers plus the Cyber template-models row, which `selectHuntCallModel`
 * prefers over the tiers) gets an operator-style pick through the per-space `inference-settings`
 * saved object, which resolution consults before recommendations and `ignoreGlobalDefault`, in
 * both the connectors route and the Worker's `endpoints.getForFeature` contract. The
 * default-connector setting is still written (without `Only`) so non-tier consumers resolve to
 * the subject too.
 *
 * Fills `previousSettings` and `previousTierPicks` space by space before each write, so a write
 * that throws partway still leaves the cleanup everything it needs to put back.
 */
const bridgeSubjectModel = async ({
  fetch,
  log,
  connectorId,
  previousSettings,
  previousTierPicks,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  connectorId: string;
  previousSettings: PreviousSettings;
  previousTierPicks: PreviousTierPicks;
}): Promise<void> => {
  for (const spaceId of EVAL_SPACE_IDS) {
    // The Worker stays enabled in every eval space between runs, and on a long-lived stack the
    // default space is the developer's own, so the cleanup restores values rather than clearing.
    const settings = await getUiSettings({ fetch, spaceId });
    previousSettings.set(
      spaceId,
      Object.fromEntries(BRIDGED_SETTING_IDS.map((key) => [key, settings[key]?.userValue ?? null]))
    );

    // A 404 means no saved picks exist yet; anything else set here must round-trip on cleanup.
    let existingPicks: InferenceSettingsResponse['data'] | null = null;
    try {
      existingPicks = (
        await fetch<InferenceSettingsResponse>(spacePath(spaceId, INFERENCE_SETTINGS_PATH), {
          method: 'GET',
          headers: apiVersion(SEARCH_INFERENCE_ENDPOINTS_API_VERSION),
        })
      ).data;
    } catch (err) {
      if (httpStatus(err) !== 404) throw err;
    }
    previousTierPicks.set(spaceId, existingPicks);

    // Keep any non-pinned picks the space already had; only the four bridged features move.
    const keptFeatures = (existingPicks?.features ?? []).filter(
      ({ feature_id }) => !ALERTZERO_BRIDGED_FEATURE_IDS.includes(feature_id)
    );
    const pinnedFeatures = ALERTZERO_BRIDGED_FEATURE_IDS.map((feature_id) => ({
      feature_id,
      endpoints: [{ id: connectorId }],
    }));

    log.info(
      `[hunt-watch] pinning Hunt tiers and the Cyber template-models pick to "${connectorId}" ` +
        `via inference settings and setting genAiSettings:defaultAIConnector="${connectorId}" ` +
        `in space "${spaceId}"`
    );
    await fetch(spacePath(spaceId, INFERENCE_SETTINGS_PATH), {
      method: 'PUT',
      headers: apiVersion(SEARCH_INFERENCE_ENDPOINTS_API_VERSION),
      body: JSON.stringify({ features: [...keptFeatures, ...pinnedFeatures] }),
    });
    await setUiSettings({
      fetch,
      spaceId,
      changes: {
        [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: connectorId,
        // Clear the flag rather than leaving it set: it survives as a user value and 400-blocks
        // explicit connector calls (the judge's) until it is overwritten.
        [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
      },
    });
  }
};

interface InferenceConnectorsResponse {
  connectors: Array<{ connectorId: string }>;
}

/**
 * Asks the server which connector each bridged feature resolves to in each eval space. The
 * connectors route runs `resolveModelsForFeature`, as the Worker's `endpoints.getForFeature` does,
 * so this fails before any example runs if the Worker would use another model than the one scored.
 * A `.inference` stack connector resolves to its inference endpoint, so either id matches.
 */
const assertTiersResolveToSubject = async ({
  fetch,
  log,
  subjectIds,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  subjectIds: readonly string[];
}): Promise<void> => {
  for (const spaceId of EVAL_SPACE_IDS) {
    for (const featureId of ALERTZERO_COST_TIER_FEATURE_IDS) {
      const { connectors } = await fetch<InferenceConnectorsResponse>(
        spacePath(spaceId, INFERENCE_CONNECTORS_PATH),
        {
          method: 'GET',
          headers: apiVersion(SEARCH_INFERENCE_ENDPOINTS_API_VERSION),
          query: { featureId },
        }
      );
      const resolved = connectors[0]?.connectorId;
      if (!resolved || !subjectIds.includes(resolved)) {
        throw new Error(
          `[hunt-watch] feature "${featureId}" resolves to "${
            resolved ?? 'no connector'
          }" in space "${spaceId}", not the subject model (${subjectIds.join(
            ' / '
          )}). The Worker ` +
            `would run on that model and the scores would be attributed to the wrong one.`
        );
      }
    }
    log.info(`[hunt-watch] every cost tier resolves to "${subjectIds[0]}" in space "${spaceId}"`);
  }
};

/**
 * The Cyber row is the one bridged feature the connectors route cannot validate: it is registered
 * with `allowTemplateRequiredModels: true`, so the route filters out ordinary connectors for it
 * and the subject would resolve to nothing there even when its pick is saved. This reads the
 * saved inference settings back instead — the same saved object `resolveFeatureEndpoints` returns
 * first, before any filtering — and fails unless the pick is the subject.
 */
const assertCyberPickPinned = async ({
  fetch,
  log,
  subjectIds,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  subjectIds: readonly string[];
}): Promise<void> => {
  for (const spaceId of EVAL_SPACE_IDS) {
    const { data } = await fetch<InferenceSettingsResponse>(
      spacePath(spaceId, INFERENCE_SETTINGS_PATH),
      {
        method: 'GET',
        headers: apiVersion(SEARCH_INFERENCE_ENDPOINTS_API_VERSION),
      }
    );
    const pick = data.features.find(
      ({ feature_id }) => feature_id === ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID
    );
    const resolved = pick?.endpoints[0]?.id;
    if (!resolved || !subjectIds.includes(resolved)) {
      throw new Error(
        `[hunt-watch] the Cyber template-models pick resolves to "${
          resolved ?? 'no connector'
        }" in space "${spaceId}", not the subject model (${subjectIds.join(' / ')}). The Worker ` +
          `would run on that model and the scores would be attributed to the wrong one.`
      );
    }
    log.info(
      `[hunt-watch] the Cyber template-models pick is "${subjectIds[0]}" in space "${spaceId}"`
    );
  }
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

/**
 * Requires the Worker's built-in role to exist in this deployment. AlertZero no longer creates
 * Worker roles: stateful ships them as Elasticsearch reserved roles, so an ES snapshot without
 * them refuses to enable the Worker, and the suite should say so by name.
 */
const findBuiltInWorkerRole = async ({
  fetch,
  accountName,
  isServerless,
}: {
  fetch: HttpHandler;
  accountName: string;
  isServerless: boolean;
}): Promise<string> => {
  const roleName = getWorkerRoleName(accountName, { isServerless });
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
  isServerless,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  workerId: string;
  isServerless: boolean;
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

  const roleName = await findBuiltInWorkerRole({ fetch, accountName: name, isServerless });
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
  isServerless,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  isServerless: boolean;
}): Promise<void> => {
  const serviceAccountId = await ensureWorkerServiceAccount({
    fetch,
    log,
    isServerless,
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
 * Ordering is load-bearing: (1) spaces must exist, as Security-solution spaces, before anything
 * is configured in them; (2) index scope before the Worker is enabled (resolveHuntScope reads
 * it); (3) the subject-model bridge, and the check that every tier resolves to it, before Worker
 * enablement (enabling without a model throws `noModel`); (4) TI supply and Entity Store are
 * independent readiness checks that can run after enablement.
 */
export const runPreflight = async ({
  fetch,
  log,
  connectorId,
  subjectInferenceId,
  evaluationConnector,
  isServerless = false,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  connectorId: string;
  /** The subject's inference endpoint id when it has one; a tier may resolve to either id. */
  subjectInferenceId?: string;
  evaluationConnector: EvalConnector;
  /** `config.serverless` from the Scout test config; defaults to the stateful stack. */
  isServerless?: boolean;
}): Promise<PreflightCleanup> => {
  for (const spaceId of EVAL_SPACE_IDS) {
    await ensureSecuritySpace({ fetch, log, spaceId, isServerless });
  }
  await configureIndexScope({ fetch, log });

  // The eval spaces are left in place on purpose. Deleting them here and recreating them on the
  // next run races the per-space Worker install, its service-account binding and the managed
  // workflow reconcile (seen as a 404 on the TI supply route and a 403 "service account binding
  // does not match" on the next run against a long-lived stack). They are eval-only and
  // `ensureSecuritySpace` is idempotent, so a CI stack discards them and a local one reuses them.
  // The Security solution view is not reverted either, `default` included: the Worker stays
  // enabled there between runs. That is why `default` is only converted when CI=true.
  const previous: PreviousSettings = new Map();
  const previousTierPicks: PreviousTierPicks = new Map();
  // Only spaces the bridge reached are restored, so a space it never wrote is left alone.
  const restoreConnectors: PreflightCleanup = async () => {
    for (const [spaceId, changes] of previous) {
      try {
        await setUiSettings({ fetch, spaceId, changes });
      } catch (err) {
        log.warning(
          `[hunt-watch] failed to restore ${BRIDGED_SETTING_IDS.join(
            ' and '
          )} in space "${spaceId}": ${errorMessage(err)}`
        );
      }
    }
    for (const [spaceId, picks] of previousTierPicks) {
      try {
        await fetch(spacePath(spaceId, INFERENCE_SETTINGS_PATH), {
          method: 'PUT',
          headers: apiVersion(SEARCH_INFERENCE_ENDPOINTS_API_VERSION),
          body: JSON.stringify({ features: picks?.features ?? [] }),
        });
      } catch (err) {
        log.warning(
          `[hunt-watch] failed to restore the inference settings in space "${spaceId}": ${errorMessage(
            err
          )}`
        );
      }
    }
  };

  // Every step below can throw, and a worker fixture that throws before `use()` never runs the
  // cleanup it would have returned, so the settings are put back here before the error leaves.
  const subjectIds = [
    ...new Set([connectorId, ...(subjectInferenceId ? [subjectInferenceId] : [])]),
  ];
  try {
    await bridgeSubjectModel({
      fetch,
      log,
      connectorId,
      previousSettings: previous,
      previousTierPicks,
    });
    await assertTiersResolveToSubject({ fetch, log, subjectIds });
    await assertCyberPickPinned({ fetch, log, subjectIds });
    await enableWorkerInEvalSpaces({ fetch, log, isServerless });
    await assertThreatIntelSupplyReady({ fetch, log });
    await ensureEntityStoreRunning({ fetch, log });
    await ensureJudgeConnectorAccessible({ fetch, connector: evaluationConnector, log });
  } catch (err) {
    await restoreConnectors();
    throw err;
  }

  return restoreConnectors;
};
