/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SpaceId } from '@kbn/core-spaces-common';
import type {
  SignificantEventsMaintenanceFailure,
  SignificantEventsMaintenanceStatus,
  SignificantEventsMaintenanceSummary,
} from '../../../common/maintenance/types';
import {
  DEFAULT_MAINTENANCE_STATE,
  type SignificantEventsMaintenanceState,
} from '../../../common/maintenance/state_machine';
import {
  MAINTENANCE_FEATURE_FLAG_ACTOR,
  MAINTENANCE_REASSERT_ACTOR,
} from '../../../common/maintenance/actors';
import type { GetScopedClients } from '../../routes/types';
import { listAllSources } from '../../routes/utils/list_all_sources';
import type { SignificantEventsServer } from '../../types';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../knowledge_indicators/data_stream';
import type { SignificantEventsMaintenanceStateAttributes } from './saved_object';
import {
  createFeatureSettingsController,
  requestForSpace,
  hasPausedSettings,
  isContinuousOnboardingWorkflowId,
  shouldRestoreSettingsBackedWorkflow,
} from './feature_settings';
import type { MaintenanceWorkflowTarget } from './managed_workflow_targets';
import { collectResetSnapshot } from './reset_snapshot';
import { resetDataStreams } from './reset_data_streams';
import type { MaintenanceAccess } from './maintenance_access';
import { createMaintenanceSystemRequest } from './system_request';
import { toMessage } from './to_message';
import { logFailures } from './log_failures';
import { deleteV2Rules, setV2RulesEnabled } from './rules';
import { requireAllSpaceIds } from './spaces';
import { runForEachSpace, throwSpaceFailures } from './run_for_each_space';
import {
  createMaintenanceStateStore,
  emptySummary,
  normalizeState,
  normalizeSummary,
  type LoadedMaintenanceState,
  type MaintenanceRuleTarget,
} from './state_store';
import {
  reEnableWorkflow,
  restoreWorkflowsAfterReset,
  sweepWorkflows,
  workflowKey,
} from './workflows';

/**
 * `mode` is how the snapshot is treated, not where the pause came from: `pause` records a
 * fresh restore snapshot, as the caller or as the system (the flag-off pause is a system
 * `pause`); `reassert` re-applies an existing pause after a workflow reinstall without
 * touching the snapshot, and always runs as the system.
 */
type PauseRun = { mode: 'pause'; access: MaintenanceAccess } | { mode: 'reassert' };

/**
 * Pauses and resumes the Significant Events background activity of one space from
 * a single synchronous call each. Pause is a control-plane action: it issues workflow
 * cancellations and disables directly from the request handler rather than
 * enqueuing a workflow execution, so it takes effect immediately instead of
 * queuing behind the very executions it is meant to stop. Both operations are
 * idempotent and persist the resulting state (and a summary) for the UI.
 *
 * The state lives in one saved object per space: the caller's space is the only
 * one that is read or written, and a space without a document is enabled.
 *
 * Calling pause while already paused re-sweeps disable/cancel so partial
 * failures (or out-of-band re-enables) can be retried without a resume cycle.
 */
export interface SignificantEventsMaintenanceService {
  /** Read the persisted maintenance state of the caller's space plus live feature-toggle values (for the UI). */
  getStatus(params: { request: KibanaRequest }): Promise<SignificantEventsMaintenanceStatus>;
  /** Read only the persisted maintenance state of the caller's space (no feature-settings I/O). */
  getState(params: { request: KibanaRequest }): Promise<SignificantEventsMaintenanceState>;
  /**
   * In the caller's space only: disable the per-space managed workflows, cancel
   * in-flight executions (including those of the shared workflows), turn off
   * continuous/scheduled Settings toggles (recording which were on), and disable
   * the alerting rules backing knowledge indicator queries. The shared workflows
   * stay enabled, since they belong to every space. Resume restores only
   * previously-enabled settings and their workflows. Safe to call again while
   * already paused: retries failed targets.
   */
  pause(params: {
    request: KibanaRequest;
    updatedBy?: string;
  }): Promise<SignificantEventsMaintenanceSummary>;
  /**
   * Pause because the Nightshift feature flag was turned off, recorded as
   * `MAINTENANCE_FEATURE_FLAG_ACTOR`. Same sweep and restore snapshot as `pause`,
   * but without a user: each existing space is paused through its own document
   * with internal clients, and rules keep running because alerting v2 has no
   * internal rules client. Spaces that are already paused are left alone. When
   * several Kibana nodes call it at once, only the node that claims a space's
   * paused state sweeps that space.
   */
  pauseOnFlagOff(): Promise<void>;
  /**
   * In the caller's space only: re-enable workflows/rules pause recorded, and
   * restore only the Settings toggles that were enabled before pause. Always
   * flips the space to `enabled` (best-effort; no compensating rollback). Targets
   * and Settings that fail to re-enable stay in the snapshot so a later Resume can
   * retry them even after the space is already reported as enabled.
   */
  resume(params: {
    request: KibanaRequest;
    updatedBy?: string;
  }): Promise<SignificantEventsMaintenanceSummary>;
  /**
   * Destructively clear all Significant Events data across every space and return
   * every space to enabled, including spaces a user had paused beforehand. Each space is
   * paused through its own document while the data is being deleted, and the spaces reset
   * paused are released again if it aborts before the data is touched.
   */
  reset(params: {
    request: KibanaRequest;
    updatedBy?: string;
  }): Promise<SignificantEventsMaintenanceSummary>;
  /**
   * After a managed-workflow install/reinstall (e.g. feature-flag flip), re-apply
   * the pause in every space whose document is paused: disable its per-space
   * workflows, cancel their executions, keep the Settings toggles off, and merge
   * any newly disabled workflows into the snapshot. Runs without a user request,
   * so it uses internal clients and leaves rules alone (alerting v2 has no
   * internal rules client). Spaces that are not paused are left alone.
   */
  reassertPause(): Promise<void>;
}

/**
 * Executions are cancelled best-effort by `cancelAllActiveWorkflowExecutions`, which returns
 * no count, so every summary reports zero.
 */
const EXECUTIONS_CANCELLED_NOT_COUNTED = 0;

/**
 * The failures a space's own document should show: those not tied to any space (data streams,
 * snapshot) and those whose target ends in `@<spaceId>`, so other spaces' failures don't
 * appear as this space's.
 */
const failuresOfSpace = (
  failures: SignificantEventsMaintenanceFailure[],
  spaceId: SpaceId
): SignificantEventsMaintenanceFailure[] =>
  failures.filter(({ target }) => !target.includes('@') || target.endsWith(`@${spaceId}`));

/** Unions workflow or rule targets by id and space; a later list wins on a shared key. */
const mergeTargets = <T extends { id: string; spaceId: SpaceId }>(...lists: T[][]): T[] => [
  ...new Map(lists.flat().map((target) => [workflowKey(target), target])).values(),
];

export const createSignificantEventsMaintenanceService = ({
  logger,
  server,
  getScopedClients,
}: {
  logger: Logger;
  server: SignificantEventsServer;
  getScopedClients: GetScopedClients;
}): SignificantEventsMaintenanceService => {
  const log = logger.get('significant-events-maintenance');
  const featureSettings = createFeatureSettingsController({ server, getScopedClients });
  const { readVersionedState, readState, claimPausedIntent, writeState, deleteState } =
    createMaintenanceStateStore(server);

  // Serialize pause/resume/reassert on this Kibana node so concurrent callers
  // cannot interleave sweeps and overwrites. Cross-node races on one space still rely on
  // last-write-wins of that space's SO; different spaces are different documents.
  let transitionChain: Promise<unknown> = Promise.resolve();
  const withTransitionLock = async <T>(run: () => Promise<T>): Promise<T> => {
    const next = transitionChain.then(run, run);
    transitionChain = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  };

  /**
   * Persist `paused` as blocking intent for a space before any side effects so
   * guards fail closed even if a later write fails. Keeps the existing inventory
   * and summary; no-op when the space is already paused. Logs and rethrows on failure.
   */
  const persistPausedIntent = async ({
    spaceId,
    existing,
    actor,
    target,
  }: {
    spaceId: SpaceId;
    existing: LoadedMaintenanceState | undefined;
    actor: string | undefined;
    target: 'pause' | 'reassert' | 'reset';
  }): Promise<void> => {
    if (normalizeState(existing?.state) === 'paused') {
      return;
    }
    try {
      await writeState(spaceId, {
        state: 'paused',
        updatedAt: new Date().toISOString(),
        updatedBy: actor,
        disabledWorkflows: existing?.disabledWorkflows ?? [],
        disabledRules: existing?.disabledRules ?? [],
        pausedSettings: existing?.pausedSettings,
        lastSummary: normalizeSummary(existing?.lastSummary) ?? emptySummary('paused'),
      });
    } catch (writeError) {
      logFailures(
        log,
        `Significant Events ${target} failed before sweep: could not persist paused intent: ${toMessage(
          writeError
        )}`,
        [{ target, error: `Failed to persist pause intent: ${toMessage(writeError)}` }]
      );
      throw writeError;
    }
  };

  const disableBackedRules = async (
    request: KibanaRequest,
    failures: SignificantEventsMaintenanceFailure[]
  ): Promise<string[]> => {
    try {
      const { getKnowledgeIndicatorClient, getSignificantEventsAlertingContext } =
        await getScopedClients({ request });
      const kiClient = await getKnowledgeIndicatorClient();
      const links = await kiClient.getRuleBackedQueryLinks();
      const ruleIds = [...new Set(links.map((link) => link.rule_id).filter(Boolean))];
      if (ruleIds.length === 0) {
        return [];
      }
      const { alertingV2RulesClient } = await getSignificantEventsAlertingContext();
      if (!alertingV2RulesClient) {
        failures.push({ target: 'rules', error: 'Alerting v2 rules client is not available' });
        return [];
      }
      const { toggledIds, failures: ruleFailures } = await setV2RulesEnabled(
        alertingV2RulesClient,
        ruleIds,
        false
      );
      failures.push(...ruleFailures);
      // Record only the rules we actually disabled, so resume re-enables exactly those.
      // Blanket re-enable on resume is intentional: if a user had manually disabled a
      // backed rule before pause, resume turns it back on (asymmetric with workflows,
      // which only record what pause itself disabled).
      return toggledIds;
    } catch (error) {
      failures.push({ target: 'rules', error: toMessage(error) });
      return [];
    }
  };

  /** Re-enable the recorded rules; returns failed ids and how many were toggled on. */
  const reEnableRules = async (
    request: KibanaRequest,
    ruleIds: string[],
    failures: SignificantEventsMaintenanceFailure[]
  ): Promise<{ failedIds: string[]; toggledCount: number }> => {
    if (ruleIds.length === 0) {
      return { failedIds: [], toggledCount: 0 };
    }
    try {
      const { getSignificantEventsAlertingContext, getKnowledgeIndicatorClient, sourcesClient } =
        await getScopedClients({ request });
      const { alertingV2RulesClient } = await getSignificantEventsAlertingContext();
      if (!alertingV2RulesClient) {
        failures.push({ target: 'rules', error: 'Alerting v2 rules client is not available' });
        // Keep every rule recorded so a later resume can retry them.
        return { failedIds: ruleIds, toggledCount: 0 };
      }
      // A source disabled before or during the pause keeps its rules off: its enabled flag owns
      // them now, and enabling the source turns them back on. They leave the record here.
      const [links, disabledSources] = await Promise.all([
        (await getKnowledgeIndicatorClient()).getRuleBackedQueryLinks(),
        listAllSources(sourcesClient, { enabled: false }),
      ]);
      const disabledSourceIds = new Set(disabledSources.map(({ id }) => id));
      const disabledSourceRuleIds = new Set(
        links.filter((link) => disabledSourceIds.has(link.source_id)).map((link) => link.rule_id)
      );
      const ruleIdsToEnable = ruleIds.filter((id) => !disabledSourceRuleIds.has(id));
      if (ruleIdsToEnable.length === 0) {
        return { failedIds: [], toggledCount: 0 };
      }
      const {
        toggledIds,
        failedIds,
        failures: ruleFailures,
      } = await setV2RulesEnabled(alertingV2RulesClient, ruleIdsToEnable, true);
      failures.push(...ruleFailures);
      return { failedIds, toggledCount: toggledIds.length };
    } catch (error) {
      failures.push({ target: 'rules', error: toMessage(error) });
      return { failedIds: ruleIds, toggledCount: 0 };
    }
  };

  /**
   * Disable + cancel the managed targets of one space, disable its backed rules, and
   * merge the result with the previous snapshot (so re-pause keeps earlier successes
   * and adds anything newly disabled).
   */
  const runPauseSweep = async ({
    request,
    access,
    spaceId,
    previousWorkflows,
    previousRules,
  }: {
    request: KibanaRequest;
    access: MaintenanceAccess;
    spaceId: SpaceId;
    previousWorkflows: MaintenanceWorkflowTarget[];
    previousRules: MaintenanceRuleTarget[];
  }): Promise<{
    disabledWorkflows: MaintenanceWorkflowTarget[];
    disabledRules: MaintenanceRuleTarget[];
    workflowsDisabledThisSweep: number;
    rulesDisabledThisSweep: number;
    failures: SignificantEventsMaintenanceFailure[];
  }> => {
    const failures: SignificantEventsMaintenanceFailure[] = [];
    const mgmt = server.workflowsManagement?.management;
    const newlyDisabled = await sweepWorkflows({ mgmt, spaceIds: [spaceId], request, failures });

    // Alerting v2 only offers request-scoped rules clients, so a system sweep
    // leaves rules running.
    const newlyDisabledRules =
      access === 'user'
        ? (await disableBackedRules(requestForSpace(request, spaceId), failures)).map((id) => ({
            id,
            spaceId,
          }))
        : [];
    const disabledRules = mergeTargets(previousRules, newlyDisabledRules);

    return {
      disabledWorkflows: mergeTargets(previousWorkflows, newlyDisabled),
      disabledRules,
      workflowsDisabledThisSweep: newlyDisabled.length,
      rulesDisabledThisSweep: newlyDisabledRules.length,
      failures,
    };
  };

  /**
   * Shared pause-persist path for `pause`, `pauseOnFlagOff`, and `reassertPause`,
   * for one space.
   *
   * Order:
   * 1. Persist `paused` (blocking intent) before side effects so guards fail closed
   *    even if the later sweep write fails.
   * 2. Sweep disable/cancel + turn Settings off.
   * 3. Persist the final snapshot (disabled targets, restore flags, summary).
   *
   * A final-write failure leaves the space paused with a possibly stale
   * snapshot; Pause again retries. For user pause, return a summary with the
   * snapshot failure recorded (partial success — intent already blocks activity).
   * Reassert still throws so workflow install cannot succeed while reassert fails.
   */
  const persistPause = async ({
    request,
    spaceId,
    existing,
    run,
    updatedBy,
  }: {
    request: KibanaRequest;
    spaceId: SpaceId;
    existing: LoadedMaintenanceState | undefined;
    run: PauseRun;
    updatedBy?: string;
  }): Promise<{
    summary: SignificantEventsMaintenanceSummary;
    sweep: Awaited<ReturnType<typeof runPauseSweep>>;
  }> => {
    const access: MaintenanceAccess = run.mode === 'reassert' ? 'system' : run.access;
    const actor =
      run.mode === 'pause' ? updatedBy : existing?.updatedBy ?? MAINTENANCE_REASSERT_ACTOR;

    // 1. Blocking intent first (skip when already paused — reassert/re-pause).
    await persistPausedIntent({ spaceId, existing, actor, target: run.mode });

    // 2. Always re-sweep: a second pause while already paused retries targets that
    // failed (or were re-enabled out-of-band) instead of returning a stale summary.
    const sweep = await runPauseSweep({
      request,
      access,
      spaceId,
      previousWorkflows: existing?.disabledWorkflows ?? [],
      previousRules: existing?.disabledRules ?? [],
    });

    // Turn Settings off after the workflow sweep so a settings write failure
    // still leaves workflows stopped.
    let pausedSettings: SignificantEventsMaintenanceStateAttributes['pausedSettings'];
    let disabledWorkflows = sweep.disabledWorkflows;
    if (run.mode === 'pause') {
      const pausedFeatures = await featureSettings.pauseFeatureSettings({
        request,
        access,
        spaceIds: [spaceId],
        previous: existing?.pausedSettings,
        failures: sweep.failures,
      });
      pausedSettings = pausedFeatures.pausedSettings;
      // Only keep continuous documents that are legitimate restore records: those
      // the settings read confirmed were on (continuousOnboardingTargets), and
      // those already recorded from a prior pause (existing.disabledWorkflows).
      // Documents the sweep disabled by drift (enabled document, setting was never
      // on and no prior record) are dropped so Resume cannot write the setting to
      // true for a space that never had it on.
      const continuousTargetKeys = new Set([
        ...pausedFeatures.continuousOnboardingTargets.map(workflowKey),
        ...(existing?.disabledWorkflows ?? [])
          .filter((w) => isContinuousOnboardingWorkflowId(w.id))
          .map(workflowKey),
      ]);
      disabledWorkflows = mergeTargets(
        disabledWorkflows.filter(
          (w) => !isContinuousOnboardingWorkflowId(w.id) || continuousTargetKeys.has(workflowKey(w))
        ),
        pausedFeatures.continuousOnboardingTargets
      );
    } else {
      await featureSettings.reassertFeatureSettingsOff({
        request,
        spaceIds: [spaceId],
        failures: sweep.failures,
      });
      // Re-assert does not change the restore snapshot.
      pausedSettings = existing?.pausedSettings;
    }

    // Snapshot lengths (not this-sweep deltas) so a clean re-pause still shows
    // how much is currently off. Cancel is best-effort via
    // cancelAllActiveWorkflowExecutions and does not return a count.
    const summary: SignificantEventsMaintenanceSummary = {
      state: 'paused',
      executionsCancelled: EXECUTIONS_CANCELLED_NOT_COUNTED,
      workflowsDisabled: disabledWorkflows.length,
      rulesDisabled: sweep.disabledRules.length,
      partialFailures: sweep.failures,
    };

    // 3. Final snapshot write.
    try {
      await writeState(spaceId, {
        state: 'paused',
        updatedAt: new Date().toISOString(),
        updatedBy: actor,
        disabledWorkflows,
        disabledRules: sweep.disabledRules,
        pausedSettings,
        lastSummary: summary,
      });
    } catch (writeError) {
      // Intent is already paused, so guards stay closed. Log the sweep outcome;
      // a later Pause retries the snapshot write.
      const snapshotFailure: SignificantEventsMaintenanceFailure = {
        target: run.mode,
        error: `Failed to persist pause snapshot: ${toMessage(writeError)}`,
      };
      const failuresWithSnapshot = [...sweep.failures, snapshotFailure];
      logFailures(
        log,
        `Significant Events ${
          run.mode
        } snapshot persist failed after sweep (state remains paused): newly disabled ${
          sweep.workflowsDisabledThisSweep
        } workflow(s) / ${sweep.rulesDisabledThisSweep} rule(s), snapshot would have ${
          disabledWorkflows.length
        } workflow(s); write error: ${toMessage(writeError)}`,
        failuresWithSnapshot
      );
      // User pause: return partial success so the UI shows a warning, not "pause failed".
      // Reassert: throw so managed-workflow install cannot succeed while reassert is broken.
      if (run.mode === 'pause') {
        return {
          summary: { ...summary, partialFailures: failuresWithSnapshot },
          sweep: { ...sweep, failures: failuresWithSnapshot },
        };
      }
      throw writeError;
    }

    return { summary, sweep };
  };

  /**
   * Reset step: snapshot every knowledge indicator / stored query, union their
   * backing rules with the rules pause had disabled and any tag-owned orphans,
   * and delete them all. Best-effort; every failure is recorded, never thrown.
   * `remainingRuleIds` are pause-disabled rules that were not deleted; they stay
   * in the inventory so Resume can re-enable them or a later Reset retry them.
   */
  const deleteOwnedRules = async ({
    request,
    previousRuleIds,
    failures,
  }: {
    request: KibanaRequest;
    previousRuleIds: string[];
    failures: SignificantEventsMaintenanceFailure[];
  }): Promise<{
    knowledgeIndicators: number;
    storedQueries: number;
    rules: number;
    remainingRuleIds: string[];
  }> => {
    const counts = { knowledgeIndicators: 0, storedQueries: 0, rules: 0 };
    const ruleIds = new Set(previousRuleIds);
    const notDeleted = (failedIds: string[]) => {
      const failed = new Set(failedIds);
      return previousRuleIds.filter((id) => failed.has(id));
    };

    let scopedClients: Awaited<ReturnType<GetScopedClients>> | undefined;
    try {
      scopedClients = await getScopedClients({ request });
      const snapshot = await collectResetSnapshot(
        await scopedClients.getKnowledgeIndicatorClient(),
        failures
      );
      counts.knowledgeIndicators = snapshot.knowledgeIndicators;
      counts.storedQueries = snapshot.storedQueries;
      for (const ruleId of snapshot.ruleIds) {
        ruleIds.add(ruleId);
      }
    } catch (error) {
      failures.push({ target: 'snapshot', error: toMessage(error) });
    }

    if (ruleIds.size === 0) {
      return { ...counts, remainingRuleIds: [] };
    }
    if (!scopedClients) {
      failures.push({ target: 'rules', error: 'Scoped clients are not available' });
      return { ...counts, remainingRuleIds: previousRuleIds };
    }
    try {
      const { alertingV2RulesClient } = await scopedClients.getSignificantEventsAlertingContext();
      if (!alertingV2RulesClient) {
        failures.push({ target: 'rules', error: 'Alerting v2 rules client is not available' });
        return { ...counts, remainingRuleIds: previousRuleIds };
      }
      const ruleResult = await deleteV2Rules(alertingV2RulesClient, [...ruleIds]);
      counts.rules = ruleResult.deleted;
      failures.push(...ruleResult.failures);
      return { ...counts, remainingRuleIds: notDeleted(ruleResult.failedIds) };
    } catch (error) {
      failures.push({ target: 'rules', error: toMessage(error) });
      return { ...counts, remainingRuleIds: previousRuleIds };
    }
  };

  /** Reset step: delete every investigation across spaces; returns how many were deleted. */
  const deleteInvestigations = async (
    failures: SignificantEventsMaintenanceFailure[]
  ): Promise<number> => {
    if (!server.nightshiftInvestigations) {
      failures.push({ target: 'investigations', error: 'Investigations plugin is not available' });
      return 0;
    }
    try {
      const result = await server.nightshiftInvestigations.deleteAllInvestigations();
      failures.push(
        ...result.failures.map(({ id, spaceId, error }) => ({
          target: `investigation:${id}@${spaceId}`,
          error,
        }))
      );
      return result.deleted;
    } catch (error) {
      failures.push({ target: 'investigations', error: toMessage(error) });
      return 0;
    }
  };

  return {
    async getState({ request }) {
      return normalizeState((await readState(request.spaceId))?.state);
    },

    async pause({ request, updatedBy }) {
      return withTransitionLock(async () => {
        const { spaceId } = request;
        const existing = await readState(spaceId);
        const { summary, sweep } = await persistPause({
          request,
          spaceId,
          existing,
          run: { mode: 'pause', access: 'user' },
          updatedBy,
        });

        logFailures(
          log,
          `Significant Events paused in space "${spaceId}": disabled ${summary.workflowsDisabled} workflow(s) and ${summary.rulesDisabled} rule(s) (this sweep: ${sweep.workflowsDisabledThisSweep}/${sweep.rulesDisabledThisSweep}), ${sweep.failures.length} failure(s)`,
          sweep.failures
        );
        return summary;
      });
    },

    async pauseOnFlagOff() {
      return withTransitionLock(async () => {
        const request = createMaintenanceSystemRequest();
        // Fails closed: a partial list would leave the missed spaces running with nothing to
        // retry them, so an enumeration error aborts the pause instead.
        const spaceIds = await requireAllSpaceIds(server);

        // A space that is already paused (e.g. by a user) keeps its own snapshot and must not
        // stop the others from being paused. Each space is claimed on its own document, so
        // several nodes can split the spaces between them, and a space is swept right after
        // its claim so a failure later in the list cannot strand it paused but unswept.
        const failures = await runForEachSpace({
          spaceIds,
          run: async (spaceId) => {
            const current = await readVersionedState(spaceId);
            if (normalizeState(current?.attributes.state) === 'paused') {
              return;
            }
            const claimed = await claimPausedIntent({
              spaceId,
              current,
              updatedBy: MAINTENANCE_FEATURE_FLAG_ACTOR,
            });
            if (!claimed) {
              log.debug(
                `Significant Events flag-off pause skipped space "${spaceId}": another node claimed it first`
              );
              return;
            }

            // `claimed` is already paused, so the intent write inside persistPause is a no-op
            // and this call only sweeps and records the snapshot.
            const { summary, sweep } = await persistPause({
              request,
              spaceId,
              existing: claimed,
              run: { mode: 'pause', access: 'system' },
              updatedBy: MAINTENANCE_FEATURE_FLAG_ACTOR,
            });

            logFailures(
              log,
              `Significant Events paused space "${spaceId}" because Nightshift was turned off: disabled ${summary.workflowsDisabled} workflow(s) (rules keep running: no internal rules client), ${sweep.failures.length} failure(s)`,
              sweep.failures
            );
          },
        });
        throwSpaceFailures('Significant Events flag-off pause', failures);
      });
    },

    async resume({ request, updatedBy }) {
      return withTransitionLock(async () => {
        const { spaceId } = request;
        const existing = await readState(spaceId);
        const currentState = normalizeState(existing?.state);
        const recordedWorkflows = existing?.disabledWorkflows ?? [];
        const recordedRules = existing?.disabledRules ?? [];
        const hasRetryInventory =
          recordedWorkflows.length > 0 ||
          recordedRules.length > 0 ||
          hasPausedSettings(existing?.pausedSettings);

        // Idempotent when fully enabled. Also accept a follow-up Resume while
        // already enabled if a prior partial resume left failed targets recorded.
        if (currentState !== 'paused' && !hasRetryInventory) {
          return emptySummary('enabled');
        }

        const failures: SignificantEventsMaintenanceFailure[] = [];
        const mgmt = server.workflowsManagement?.management;
        const pausedSettings = existing?.pausedSettings;
        // First resume from paused gates settings-backed workflows. A retry of
        // leftover inventory already filtered those once — retry everything left.
        const isFirstResumeFromPaused = currentState === 'paused';
        const shouldAttemptWorkflow = (workflow: MaintenanceWorkflowTarget): boolean =>
          !isFirstResumeFromPaused || shouldRestoreSettingsBackedWorkflow(workflow, pausedSettings);

        // Best-effort restore: re-enable inventory, restore settings, then flip the
        // control plane to enabled. Partial failures are reported as warnings —
        // no compensating rollback (rollback can fail too). Failed targets stay
        // in the snapshot so a later Resume can retry them.
        let workflowsToggled = 0;
        const remainingWorkflows: MaintenanceWorkflowTarget[] = [];
        if (mgmt) {
          for (const workflow of recordedWorkflows) {
            if (!shouldAttemptWorkflow(workflow)) {
              continue;
            }
            const outcome = await reEnableWorkflow(mgmt, workflow, request, failures);
            if (outcome === 'toggled') {
              workflowsToggled += 1;
            } else if (outcome === 'failed') {
              remainingWorkflows.push(workflow);
            }
            // A recorded continuous document is the restore record for its space
            // setting. It stays recorded until the setting write succeeds.
            if (
              (outcome === 'toggled' || outcome === 'already') &&
              isContinuousOnboardingWorkflowId(workflow.id) &&
              !(await featureSettings.restoreContinuousOnboarding({
                request,
                spaceId: workflow.spaceId,
                failures,
              }))
            ) {
              remainingWorkflows.push(workflow);
            }
          }
        } else {
          for (const workflow of recordedWorkflows) {
            if (shouldAttemptWorkflow(workflow)) {
              remainingWorkflows.push(workflow);
            }
          }
          if (remainingWorkflows.length > 0) {
            failures.push({
              target: 'workflows',
              error: 'Workflows management plugin is not available',
            });
          }
        }

        const restoredRules = await reEnableRules(
          requestForSpace(request, spaceId),
          recordedRules.map(({ id }) => id),
          failures
        );
        const remainingRules = restoredRules.failedIds.map((id) => ({ id, spaceId }));
        const rulesToggled = restoredRules.toggledCount;

        const remainingSettings = await featureSettings.resumeFeatureSettings({
          request,
          pausedSettings,
          failures,
        });

        const summary: SignificantEventsMaintenanceSummary = {
          state: 'enabled',
          executionsCancelled: EXECUTIONS_CANCELLED_NOT_COUNTED,
          workflowsDisabled: remainingWorkflows.length,
          rulesDisabled: remainingRules.length,
          partialFailures: failures,
        };

        try {
          await writeState(spaceId, {
            state: 'enabled',
            updatedAt: new Date().toISOString(),
            updatedBy,
            disabledWorkflows: remainingWorkflows,
            disabledRules: remainingRules,
            pausedSettings: remainingSettings,
            lastSummary: summary,
          });
        } catch (writeError) {
          failures.push({
            target: 'resume',
            error: `Failed to persist resume state: ${toMessage(writeError)}`,
          });
          logFailures(
            log,
            `Significant Events resume persist failed after best-effort re-enable: ${toMessage(
              writeError
            )}`,
            failures
          );
          throw writeError;
        }

        const message = `Significant Events resume completed in space "${spaceId}": toggled on ${workflowsToggled} workflow(s) and ${rulesToggled} rule(s), ${failures.length} failure(s); ${remainingWorkflows.length} workflow(s) / ${remainingRules.length} rule(s) still disabled`;
        if (failures.length === 0) {
          log.info(message);
        } else {
          logFailures(log, message, failures);
        }
        return summary;
      });
    },

    async reset({ request, updatedBy }) {
      return withTransitionLock(async () => {
        const failures: SignificantEventsMaintenanceFailure[] = [];

        // Reset deletes data shared by every space, so every space is paused through its
        // own document first. The list must be complete: a space that is missed here would
        // keep starting work against data that is being deleted. A space without a document
        // gets one, and that document is removed again once nothing is left to restore.
        const allSpaceIds = await requireAllSpaceIds(server);
        const existingBySpace = new Map<SpaceId, LoadedMaintenanceState | undefined>(
          await Promise.all(
            allSpaceIds.map(
              async (spaceId) =>
                [spaceId, await readState(spaceId)] as [SpaceId, LoadedMaintenanceState | undefined]
            )
          )
        );
        const createdSpaceIds = new Set(
          allSpaceIds.filter((spaceId) => existingBySpace.get(spaceId) === undefined)
        );

        // Spaces this reset moved from enabled to paused. If reset aborts before the data is
        // touched, only these are put back: nothing else would ever un-pause them, and every
        // space but the caller's own could not be resumed from here.
        const pausedByReset: SpaceId[] = [];
        const releaseResetPause = async (): Promise<void> => {
          const stuck = await runForEachSpace({
            spaceIds: pausedByReset,
            run: async (spaceId) => {
              const previous = existingBySpace.get(spaceId);
              if (previous) {
                await writeState(spaceId, previous);
              } else {
                await deleteState(spaceId);
              }
            },
          });
          stuck.forEach(({ spaceId, error }) =>
            log.error(
              `Significant Events reset could not release the pause of space "${spaceId}" after aborting: ${toMessage(
                error
              )}`
            )
          );
        };

        try {
          for (const spaceId of allSpaceIds) {
            const existing = existingBySpace.get(spaceId);
            await persistPausedIntent({
              spaceId,
              existing,
              actor: updatedBy,
              target: 'reset',
            });
            if (normalizeState(existing?.state) !== 'paused') {
              pausedByReset.push(spaceId);
            }
          }
        } catch (pauseError) {
          await releaseResetPause();
          throw pauseError;
        }

        // Stop activity first, as pause does, then destroy data, then restore. The sweep
        // covers every space, not only those visible to the caller, since every space was
        // just marked paused.
        const mgmt = server.workflowsManagement?.management;
        const newlyDisabled = await sweepWorkflows({
          mgmt,
          spaceIds: allSpaceIds,
          request,
          failures,
        });
        const recoveryWorkflows = mergeTargets(
          allSpaceIds.flatMap((spaceId) => existingBySpace.get(spaceId)?.disabledWorkflows ?? []),
          newlyDisabled
        );
        const settingsStillOn = await featureSettings.reassertFeatureSettingsOff({
          request,
          spaceIds: allSpaceIds,
          failures,
        });

        // Persist the swept inventory before destroying data: an interrupted reset must
        // leave Resume (or a repeated Reset) the workflows it disabled, since a later
        // sweep only records what it toggles itself.
        try {
          for (const sweptSpaceId of new Set(newlyDisabled.map(({ spaceId }) => spaceId))) {
            const existing = existingBySpace.get(sweptSpaceId);
            await writeState(sweptSpaceId, {
              state: 'paused',
              updatedAt: new Date().toISOString(),
              updatedBy,
              disabledWorkflows: recoveryWorkflows.filter(
                ({ spaceId }) => spaceId === sweptSpaceId
              ),
              disabledRules: existing?.disabledRules ?? [],
              pausedSettings: existing?.pausedSettings,
              lastSummary: normalizeSummary(existing?.lastSummary) ?? emptySummary('paused'),
            });
          }
        } catch (writeError) {
          // Nothing durable records this sweep, so re-enable what it disabled (except
          // settings-backed workflows whose toggles are now off) before aborting.
          await restoreWorkflowsAfterReset({
            mgmt,
            workflows: newlyDisabled,
            settingsStillOn,
            request,
            failures,
          });
          await releaseResetPause();
          logFailures(
            log,
            `Significant Events reset failed before destructive cleanup: could not persist disabled workflows (${toMessage(
              writeError
            )}); rolled back this sweep`,
            failures
          );
          throw writeError;
        }

        // The snapshot below searches the knowledge-indicator stream; refresh it first so
        // unrefreshed revisions are counted (and their rules found) before the wipe.
        // Refresh needs `maintenance`, which only the caller may hold.
        const esClient = server.core.elasticsearch.client.asScoped(request).asCurrentUser;
        const internalEsClient = server.core.elasticsearch.client.asInternalUser;
        try {
          await esClient.indices.refresh({
            index: KNOWLEDGE_INDICATORS_DATA_STREAM,
            ignore_unavailable: true,
          });
        } catch (error) {
          failures.push({ target: 'snapshot:refresh', error: toMessage(error) });
        }

        const previousRules = allSpaceIds.flatMap(
          (spaceId) => existingBySpace.get(spaceId)?.disabledRules ?? []
        );
        const ruleSpaces = [
          ...new Set([...allSpaceIds, ...previousRules.map(({ spaceId }) => spaceId)]),
        ];
        const deletedRules = await Promise.all(
          ruleSpaces.map(async (spaceId) => {
            const result = await deleteOwnedRules({
              request: requestForSpace(request, spaceId),
              previousRuleIds: previousRules
                .filter((rule) => rule.spaceId === spaceId)
                .map(({ id }) => id),
              failures,
            });
            return {
              ...result,
              remainingRules: result.remainingRuleIds.map((id) => ({ id, spaceId })),
            };
          })
        );
        const remainingRules = deletedRules.flatMap((result) => result.remainingRules);
        const { knowledgeIndicators, storedQueries, rules } = deletedRules.reduce(
          (total, result) => ({
            knowledgeIndicators: total.knowledgeIndicators + result.knowledgeIndicators,
            storedQueries: total.storedQueries + result.storedQueries,
            rules: total.rules + result.rules,
          }),
          { knowledgeIndicators: 0, storedQueries: 0, rules: 0 }
        );
        const investigations = await deleteInvestigations(failures);
        const wipedDataStreams = await resetDataStreams({
          esClient,
          internalEsClient,
          dataStreams: server.core.dataStreams,
          failures,
        });
        // Indicators and queries live in the knowledge-indicator stream; the snapshot
        // counted them before the wipe, so only report them deleted if the wipe happened.
        const indicatorsWiped = wipedDataStreams.has(KNOWLEDGE_INDICATORS_DATA_STREAM);

        const remainingWorkflows = await restoreWorkflowsAfterReset({
          mgmt,
          workflows: recoveryWorkflows,
          settingsStillOn,
          request,
          failures,
        });

        const summary: SignificantEventsMaintenanceSummary = {
          state: 'enabled',
          executionsCancelled: EXECUTIONS_CANCELLED_NOT_COUNTED,
          workflowsDisabled: remainingWorkflows.length,
          rulesDisabled: remainingRules.length,
          deleted: {
            knowledgeIndicators: indicatorsWiped ? knowledgeIndicators : 0,
            storedQueries: indicatorsWiped ? storedQueries : 0,
            rules,
            investigations,
            dataStreams: wipedDataStreams.size,
          },
          partialFailures: failures,
        };

        // Every space goes back to enabled. What could not be restored stays on its own
        // space's document so a later Resume there can retry it. A document this reset
        // created for a space that was never paused is removed instead of left empty.
        const finalSpaceIds = new Set([
          ...allSpaceIds,
          ...newlyDisabled.map(({ spaceId }) => spaceId),
          ...remainingWorkflows.map(({ spaceId }) => spaceId),
          ...remainingRules.map(({ spaceId }) => spaceId),
        ]);
        const writeFailures = await runForEachSpace({
          spaceIds: finalSpaceIds,
          run: async (spaceId) => {
            const spaceWorkflows = remainingWorkflows.filter(
              (target) => target.spaceId === spaceId
            );
            const spaceRules = remainingRules.filter((target) => target.spaceId === spaceId);
            if (
              createdSpaceIds.has(spaceId) &&
              spaceWorkflows.length === 0 &&
              spaceRules.length === 0
            ) {
              try {
                await deleteState(spaceId);
                return;
              } catch (deleteError) {
                // Fall back to an enabled document: a leftover paused one would keep the space blocked.
                log.warn(
                  `Significant Events reset could not remove the maintenance document of space "${spaceId}": ${toMessage(
                    deleteError
                  )}`
                );
              }
            }
            await writeState(spaceId, {
              state: 'enabled',
              updatedAt: new Date().toISOString(),
              updatedBy,
              disabledWorkflows: spaceWorkflows,
              disabledRules: spaceRules,
              lastSummary: {
                ...summary,
                workflowsDisabled: spaceWorkflows.length,
                rulesDisabled: spaceRules.length,
                partialFailures: failuresOfSpace(failures, spaceId),
              },
            });
          },
        });
        writeFailures.forEach(({ spaceId, error }) =>
          log.error(
            `Significant Events reset persist failed after destructive cleanup in space "${spaceId}": ${toMessage(
              error
            )}`
          )
        );
        throwSpaceFailures('Significant Events reset persist', writeFailures);

        logFailures(
          log,
          `Significant Events reset completed with ${failures.length} failure(s)`,
          failures
        );
        return summary;
      });
    },

    async reassertPause() {
      return withTransitionLock(async () => {
        const request = createMaintenanceSystemRequest();
        // Fails closed, like the flag-off pause: a reinstall must not succeed while a
        // space it could not list keeps its freshly installed workflows enabled.
        const spaceIds = await requireAllSpaceIds(server);

        // Only the spaces whose document is paused are touched. Every space is tried even
        // when one fails, and the failures are thrown afterwards.
        const failures = await runForEachSpace({
          spaceIds,
          run: async (spaceId) => {
            const existing = await readState(spaceId);
            if (normalizeState(existing?.state) !== 'paused') {
              return;
            }

            const { summary, sweep } = await persistPause({
              request,
              spaceId,
              existing,
              run: { mode: 'reassert' },
            });

            if (sweep.workflowsDisabledThisSweep > 0 || summary.partialFailures.length > 0) {
              logFailures(
                log,
                `Significant Events re-asserted pause in space "${spaceId}" after workflow install: disabled ${sweep.workflowsDisabledThisSweep} workflow(s), ${summary.partialFailures.length} failure(s)`,
                summary.partialFailures
              );
            }
          },
        });
        throwSpaceFailures('Significant Events pause re-assert', failures);
      });
    },

    async getStatus({ request }) {
      const existing = await readState(request.spaceId);
      const state = normalizeState(existing?.state);
      let featureSettingsStatus:
        | Awaited<ReturnType<typeof featureSettings.readFeatureSettingsStatus>>
        | undefined;
      let featureSettingsUnavailable = false;
      try {
        featureSettingsStatus = await featureSettings.readFeatureSettingsStatus(request);
      } catch (error) {
        featureSettingsUnavailable = true;
        log.warn(
          `Significant Events maintenance status: failed to read feature settings: ${toMessage(
            error
          )}`
        );
        // While paused, fail closed so the UI does not sync stale enabled=true
        // toggles when uiSettings are unreadable.
        if (state === 'paused') {
          featureSettingsStatus = {
            continuousOnboardingEnabled: false,
            scheduledDiscoveryEnabled: false,
          };
        }
      }
      const featureSettingsFields = {
        ...(featureSettingsStatus ? { featureSettings: featureSettingsStatus } : {}),
        ...(featureSettingsUnavailable ? { featureSettingsUnavailable: true } : {}),
      };
      if (!existing) {
        return { state: DEFAULT_MAINTENANCE_STATE, ...featureSettingsFields };
      }
      return {
        state,
        updatedAt: existing.updatedAt,
        updatedBy: existing.updatedBy,
        lastSummary: normalizeSummary(existing.lastSummary),
        ...featureSettingsFields,
      };
    },
  };
};
