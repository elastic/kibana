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
import { MAINTENANCE_FEATURE_FLAG_ACTOR } from '../../../common/maintenance/actors';
import type { GetScopedClients } from '../../routes/types';
import type { SignificantEventsServer } from '../../types';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../knowledge_indicators/data_stream';
import type { SignificantEventsMaintenanceStateAttributes } from './saved_object';
import {
  createFeatureSettingsController,
  hasPausedSettings,
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
import { getAllSpaceIds } from './spaces';
import {
  createMaintenanceStateStore,
  emptySummary,
  normalizeState,
  normalizeSummary,
  type LoadedMaintenanceState,
} from './state_store';
import {
  reEnableWorkflow,
  restoreWorkflowsAfterReset,
  sweepWorkflows,
  workflowKey,
} from './workflows';

/**
 * `pause` records a fresh restore snapshot, as the caller or as the system;
 * `reassert` re-applies an existing pause after a workflow reinstall without
 * touching the snapshot, and always runs as the system.
 */
type PauseRun = { mode: 'pause'; access: MaintenanceAccess } | { mode: 'reassert' };

/**
 * Pauses and resumes all Significant Events background activity from a single
 * synchronous call each. Pause is a control-plane action: it issues workflow
 * cancellations and disables directly from the request handler rather than
 * enqueuing a workflow execution, so it takes effect immediately instead of
 * queuing behind the very executions it is meant to stop. Both operations are
 * idempotent and persist the resulting state (and a summary) for the UI.
 *
 * Calling pause while already paused re-sweeps disable/cancel so partial
 * failures (or out-of-band re-enables) can be retried without a resume cycle.
 */
export interface SignificantEventsMaintenanceService {
  /** Read the persisted maintenance state plus live feature-toggle values (for the UI). */
  getStatus(params: { request: KibanaRequest }): Promise<SignificantEventsMaintenanceStatus>;
  /** Read only the persisted maintenance state (no feature-settings I/O). */
  getState(params: { request: KibanaRequest }): Promise<SignificantEventsMaintenanceState>;
  /**
   * Disable every managed workflow across spaces, cancel their in-flight
   * executions, turn off continuous/scheduled Settings toggles (recording which
   * were on), and disable the alerting rules backing knowledge indicator
   * queries. Resume restores only previously-enabled settings and their
   * workflows. Safe to call again while already paused: retries failed targets.
   */
  pause(params: {
    request: KibanaRequest;
    updatedBy?: string;
  }): Promise<SignificantEventsMaintenanceSummary>;
  /**
   * Pause because the Nightshift feature flag was turned off, recorded as
   * `MAINTENANCE_FEATURE_FLAG_ACTOR`. Same sweep and restore snapshot as `pause`,
   * but without a user: internal clients across every space, and rules keep
   * running because alerting v2 has no internal rules client. When several Kibana
   * nodes call it at once, only the one that claims the paused state sweeps.
   * No-op when already paused.
   */
  pauseOnFlagOff(): Promise<void>;
  /**
   * Re-enable workflows/rules pause recorded, and restore only the Settings
   * toggles that were enabled before pause. Always flips the control plane to
   * `enabled` (best-effort; no compensating rollback). Targets and Settings
   * that fail to re-enable stay in the snapshot so a later Resume can retry
   * them even after the deployment is already reported as enabled.
   */
  resume(params: {
    request: KibanaRequest;
    updatedBy?: string;
  }): Promise<SignificantEventsMaintenanceSummary>;
  /** Destructively clear all Significant Events data and return activity to enabled. */
  reset(params: {
    request: KibanaRequest;
    updatedBy?: string;
  }): Promise<SignificantEventsMaintenanceSummary>;
  /**
   * After a managed-workflow install/reinstall (e.g. feature-flag flip), if the
   * deployment is paused, re-apply the pause: disable every managed workflow in
   * every space, cancel their executions, keep the Settings toggles off, and merge
   * any newly disabled workflows into the snapshot. Runs without a user request,
   * so it uses internal clients and leaves rules alone (alerting v2 has no
   * internal rules client). No-op when not paused.
   */
  reassertPause(): Promise<void>;
}

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
  const { readVersionedState, readState, claimPausedIntent, writeState } =
    createMaintenanceStateStore(server);

  // Serialize pause/resume/reassert on this Kibana node so concurrent callers
  // cannot interleave sweeps and overwrites. Cross-node races still rely on
  // last-write-wins of the single deployment-wide SO.
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
   * Persist `paused` as blocking intent before any side effects so guards fail
   * closed even if a later write fails. Keeps the existing inventory and
   * summary; no-op when already paused. Logs and rethrows on failure.
   */
  const persistPausedIntent = async ({
    existing,
    actor,
    target,
  }: {
    existing: LoadedMaintenanceState | undefined;
    actor: string | undefined;
    target: 'pause' | 'reassert' | 'reset';
  }): Promise<void> => {
    if (normalizeState(existing?.state) === 'paused') {
      return;
    }
    try {
      await writeState({
        state: 'paused',
        updatedAt: new Date().toISOString(),
        updatedBy: actor,
        disabledWorkflows: existing?.disabledWorkflows ?? [],
        disabledRuleIds: existing?.disabledRuleIds ?? [],
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
      const { getSignificantEventsAlertingContext } = await getScopedClients({ request });
      const { alertingV2RulesClient } = await getSignificantEventsAlertingContext();
      if (!alertingV2RulesClient) {
        failures.push({ target: 'rules', error: 'Alerting v2 rules client is not available' });
        // Keep every rule recorded so a later resume can retry them.
        return { failedIds: ruleIds, toggledCount: 0 };
      }
      const {
        toggledIds,
        failedIds,
        failures: ruleFailures,
      } = await setV2RulesEnabled(alertingV2RulesClient, ruleIds, true);
      failures.push(...ruleFailures);
      return { failedIds, toggledCount: toggledIds.length };
    } catch (error) {
      failures.push({ target: 'rules', error: toMessage(error) });
      return { failedIds: ruleIds, toggledCount: 0 };
    }
  };

  /**
   * Disable + cancel every managed target, disable backed rules, and merge the
   * result with the previous snapshot (so re-pause keeps earlier successes and
   * adds anything newly disabled). Enumerates spaces once and returns them so
   * the settings step can reuse the same list.
   */
  const runPauseSweep = async ({
    request,
    access,
    previousWorkflows,
    previousRuleIds,
  }: {
    request: KibanaRequest;
    access: MaintenanceAccess;
    previousWorkflows: MaintenanceWorkflowTarget[];
    previousRuleIds: string[];
  }): Promise<{
    disabledWorkflows: MaintenanceWorkflowTarget[];
    disabledRuleIds: string[];
    workflowsDisabledThisSweep: number;
    rulesDisabledThisSweep: number;
    failures: SignificantEventsMaintenanceFailure[];
    spaceIds: SpaceId[];
  }> => {
    const failures: SignificantEventsMaintenanceFailure[] = [];
    const mgmt = server.workflowsManagement?.management;
    // Enumerate spaces regardless of workflow availability: settings still need
    // to be turned off per space even when workflows management is down.
    const spaceIds = await getAllSpaceIds({ server, request, access, failures });
    const newlyDisabled = await sweepWorkflows({ mgmt, spaceIds, request, failures });

    // Alerting v2 only offers request-scoped rules clients, so a system sweep
    // leaves rules running.
    const newlyDisabledRuleIds =
      access === 'user' ? await disableBackedRules(request, failures) : [];

    const workflowByKey = new Map<string, MaintenanceWorkflowTarget>();
    for (const workflow of previousWorkflows) {
      workflowByKey.set(workflowKey(workflow), workflow);
    }
    for (const target of newlyDisabled) {
      workflowByKey.set(workflowKey(target), target);
    }

    const disabledRuleIds = [...new Set([...previousRuleIds, ...newlyDisabledRuleIds])];

    return {
      disabledWorkflows: [...workflowByKey.values()],
      disabledRuleIds,
      workflowsDisabledThisSweep: newlyDisabled.length,
      rulesDisabledThisSweep: newlyDisabledRuleIds.length,
      failures,
      spaceIds,
    };
  };

  /**
   * Shared pause-persist path for `pause`, `pauseOnFlagOff`, and `reassertPause`.
   *
   * Order:
   * 1. Persist `paused` (blocking intent) before side effects so guards fail closed
   *    even if the later sweep write fails.
   * 2. Sweep disable/cancel + turn Settings off.
   * 3. Persist the final snapshot (disabled targets, restore flags, summary).
   *
   * A final-write failure leaves the deployment paused with a possibly stale
   * snapshot; Pause again retries. For user pause, return a summary with the
   * snapshot failure recorded (partial success — intent already blocks activity).
   * Reassert still throws so workflow install cannot succeed while reassert fails.
   */
  const persistPause = async ({
    request,
    existing,
    run,
    updatedBy,
  }: {
    request: KibanaRequest;
    existing: LoadedMaintenanceState | undefined;
    run: PauseRun;
    updatedBy?: string;
  }): Promise<{
    summary: SignificantEventsMaintenanceSummary;
    sweep: Awaited<ReturnType<typeof runPauseSweep>>;
  }> => {
    const { mode } = run;
    const access: MaintenanceAccess = run.mode === 'reassert' ? 'system' : run.access;
    const actor = mode === 'pause' ? updatedBy : existing?.updatedBy ?? 'system:reassert';

    // 1. Blocking intent first (skip when already paused — reassert/re-pause).
    await persistPausedIntent({ existing, actor, target: mode });

    // 2. Always re-sweep: a second pause while already paused retries targets that
    // failed (or were re-enabled out-of-band) instead of returning a stale summary.
    const sweep = await runPauseSweep({
      request,
      access,
      previousWorkflows: existing?.disabledWorkflows ?? [],
      previousRuleIds: existing?.disabledRuleIds ?? [],
    });

    // Turn Settings off after the workflow sweep so a settings write failure
    // still leaves workflows stopped. Reuse the sweep's space enumeration.
    let pausedSettings: SignificantEventsMaintenanceStateAttributes['pausedSettings'];
    if (mode === 'pause') {
      pausedSettings = await featureSettings.pauseFeatureSettings({
        request,
        access,
        spaceIds: sweep.spaceIds,
        previous: existing?.pausedSettings,
        failures: sweep.failures,
      });
    } else {
      await featureSettings.reassertFeatureSettingsOff({
        request,
        spaceIds: sweep.spaceIds,
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
      executionsCancelled: 0,
      workflowsDisabled: sweep.disabledWorkflows.length,
      rulesDisabled: sweep.disabledRuleIds.length,
      partialFailures: sweep.failures,
    };

    // 3. Final snapshot write.
    try {
      await writeState({
        state: 'paused',
        updatedAt: new Date().toISOString(),
        updatedBy: actor,
        disabledWorkflows: sweep.disabledWorkflows,
        disabledRuleIds: sweep.disabledRuleIds,
        pausedSettings,
        lastSummary: summary,
      });
    } catch (writeError) {
      // Intent is already paused, so guards stay closed. Log the sweep outcome;
      // a later Pause retries the snapshot write.
      const snapshotFailure: SignificantEventsMaintenanceFailure = {
        target: mode === 'reassert' ? 'reassert' : 'pause',
        error: `Failed to persist pause snapshot: ${toMessage(writeError)}`,
      };
      const failuresWithSnapshot = [...sweep.failures, snapshotFailure];
      logFailures(
        log,
        `Significant Events ${mode} snapshot persist failed after sweep (state remains paused): newly disabled ${
          sweep.workflowsDisabledThisSweep
        } workflow(s) / ${sweep.rulesDisabledThisSweep} rule(s), snapshot would have ${
          sweep.disabledWorkflows.length
        } workflow(s); write error: ${toMessage(writeError)}`,
        failuresWithSnapshot
      );
      // User pause: return partial success so the UI shows a warning, not "pause failed".
      // Reassert: throw so managed-workflow install cannot succeed while reassert is broken.
      if (mode === 'pause') {
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
      return normalizeState((await readState())?.state);
    },

    async pause({ request, updatedBy }) {
      return withTransitionLock(async () => {
        const existing = await readState();
        const { summary, sweep } = await persistPause({
          request,
          existing,
          run: { mode: 'pause', access: 'user' },
          updatedBy,
        });

        logFailures(
          log,
          `Significant Events paused: disabled ${summary.workflowsDisabled} workflow(s) and ${summary.rulesDisabled} rule(s) (this sweep: ${sweep.workflowsDisabledThisSweep}/${sweep.rulesDisabledThisSweep}), ${sweep.failures.length} failure(s)`,
          sweep.failures
        );
        return summary;
      });
    },

    async pauseOnFlagOff() {
      return withTransitionLock(async () => {
        const current = await readVersionedState();
        if (normalizeState(current?.attributes.state) === 'paused') {
          return;
        }
        const claimed = await claimPausedIntent({
          current,
          updatedBy: MAINTENANCE_FEATURE_FLAG_ACTOR,
        });
        if (!claimed) {
          log.debug('Significant Events flag-off pause skipped: another node claimed it first');
          return;
        }

        const { summary, sweep } = await persistPause({
          request: createMaintenanceSystemRequest(),
          existing: claimed,
          run: { mode: 'pause', access: 'system' },
          updatedBy: MAINTENANCE_FEATURE_FLAG_ACTOR,
        });

        logFailures(
          log,
          `Significant Events paused because Nightshift was turned off: disabled ${summary.workflowsDisabled} workflow(s) (rules keep running: no internal rules client), ${sweep.failures.length} failure(s)`,
          sweep.failures
        );
      });
    },

    async resume({ request, updatedBy }) {
      return withTransitionLock(async () => {
        const existing = await readState();
        const currentState = normalizeState(existing?.state);
        const recordedWorkflows = existing?.disabledWorkflows ?? [];
        const recordedRuleIds = existing?.disabledRuleIds ?? [];
        const hasRetryInventory =
          recordedWorkflows.length > 0 ||
          recordedRuleIds.length > 0 ||
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

        const { failedIds: remainingRuleIds, toggledCount: rulesToggled } = await reEnableRules(
          request,
          recordedRuleIds,
          failures
        );

        const remainingSettings = await featureSettings.resumeFeatureSettings({
          request,
          pausedSettings,
          failures,
        });

        const summary: SignificantEventsMaintenanceSummary = {
          state: 'enabled',
          executionsCancelled: 0,
          workflowsDisabled: remainingWorkflows.length,
          rulesDisabled: remainingRuleIds.length,
          partialFailures: failures,
        };

        try {
          await writeState({
            state: 'enabled',
            updatedAt: new Date().toISOString(),
            updatedBy,
            disabledWorkflows: remainingWorkflows,
            disabledRuleIds: remainingRuleIds,
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

        const message = `Significant Events resume completed: toggled on ${workflowsToggled} workflow(s) and ${rulesToggled} rule(s), ${failures.length} failure(s); ${remainingWorkflows.length} workflow(s) / ${remainingRuleIds.length} rule(s) still disabled`;
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
        const existing = await readState();
        const failures: SignificantEventsMaintenanceFailure[] = [];
        await persistPausedIntent({ existing, actor: updatedBy, target: 'reset' });

        // Stop activity first, as pause does, then destroy data, then restore.
        const spaceIds = await getAllSpaceIds({ server, request, access: 'user', failures });
        const mgmt = server.workflowsManagement?.management;
        const recoveryByKey = new Map<string, MaintenanceWorkflowTarget>();
        for (const workflow of existing?.disabledWorkflows ?? []) {
          recoveryByKey.set(workflowKey(workflow), workflow);
        }
        for (const target of await sweepWorkflows({ mgmt, spaceIds, request, failures })) {
          recoveryByKey.set(workflowKey(target), target);
        }
        const settingsStillOn = await featureSettings.reassertFeatureSettingsOff({
          request,
          spaceIds,
          failures,
        });

        // The snapshot below searches the knowledge-indicator stream; refresh it first so
        // unrefreshed revisions are counted (and their rules found) before the wipe.
        const internalEsClient = server.core.elasticsearch.client.asInternalUser;
        try {
          await internalEsClient.indices.refresh({
            index: KNOWLEDGE_INDICATORS_DATA_STREAM,
            ignore_unavailable: true,
          });
        } catch (error) {
          failures.push({ target: 'snapshot:refresh', error: toMessage(error) });
        }

        const { knowledgeIndicators, storedQueries, rules, remainingRuleIds } =
          await deleteOwnedRules({
            request,
            previousRuleIds: existing?.disabledRuleIds ?? [],
            failures,
          });
        const investigations = await deleteInvestigations(failures);
        const wipedDataStreams = await resetDataStreams({
          esClient: server.core.elasticsearch.client.asScoped(request).asCurrentUser,
          internalEsClient,
          dataStreams: server.core.dataStreams,
          failures,
        });
        // Indicators and queries live in the knowledge-indicator stream; the snapshot
        // counted them before the wipe, so only report them deleted if the wipe happened.
        const indicatorsWiped = wipedDataStreams.has(KNOWLEDGE_INDICATORS_DATA_STREAM);

        const remainingWorkflows = await restoreWorkflowsAfterReset({
          mgmt,
          workflows: [...recoveryByKey.values()],
          settingsStillOn,
          request,
          failures,
        });

        const summary: SignificantEventsMaintenanceSummary = {
          state: 'enabled',
          executionsCancelled: 0,
          workflowsDisabled: remainingWorkflows.length,
          rulesDisabled: remainingRuleIds.length,
          deleted: {
            knowledgeIndicators: indicatorsWiped ? knowledgeIndicators : 0,
            storedQueries: indicatorsWiped ? storedQueries : 0,
            rules,
            investigations,
            dataStreams: wipedDataStreams.size,
          },
          partialFailures: failures,
        };

        try {
          await writeState({
            state: 'enabled',
            updatedAt: new Date().toISOString(),
            updatedBy,
            disabledWorkflows: remainingWorkflows,
            disabledRuleIds: remainingRuleIds,
            lastSummary: summary,
          });
        } catch (writeError) {
          log.error(
            `Significant Events reset persist failed after destructive cleanup: ${toMessage(
              writeError
            )}`
          );
          throw writeError;
        }

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
        const existing = await readState();
        if (normalizeState(existing?.state) !== 'paused') {
          return;
        }

        const { summary, sweep } = await persistPause({
          request: createMaintenanceSystemRequest(),
          existing,
          run: { mode: 'reassert' },
        });

        if (sweep.workflowsDisabledThisSweep > 0 || summary.partialFailures.length > 0) {
          logFailures(
            log,
            `Significant Events re-asserted pause after workflow install: disabled ${sweep.workflowsDisabledThisSweep} workflow(s), ${summary.partialFailures.length} failure(s)`,
            summary.partialFailures
          );
        }
      });
    },

    async getStatus({ request }) {
      const existing = await readState();
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
      if (!existing) {
        return {
          state: DEFAULT_MAINTENANCE_STATE,
          ...(featureSettingsStatus ? { featureSettings: featureSettingsStatus } : {}),
          ...(featureSettingsUnavailable ? { featureSettingsUnavailable: true } : {}),
        };
      }
      return {
        state,
        updatedAt: existing.updatedAt,
        updatedBy: existing.updatedBy,
        lastSummary: normalizeSummary(existing.lastSummary),
        ...(featureSettingsStatus ? { featureSettings: featureSettingsStatus } : {}),
        ...(featureSettingsUnavailable ? { featureSettingsUnavailable: true } : {}),
      };
    },
  };
};
