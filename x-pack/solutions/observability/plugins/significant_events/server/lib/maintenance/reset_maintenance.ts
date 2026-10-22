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
  SignificantEventsMaintenanceSummary,
} from '../../../common/maintenance/types';
import type { GetScopedClients } from '../../routes/types';
import type { SignificantEventsServer } from '../../types';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../knowledge_indicators/data_stream';
import {
  continuousOnboardingWorkflowTarget,
  emptyStillOn,
  isContinuousOnboardingWorkflowId,
  isScheduledDiscoveryWorkflowId,
  shouldRestoreSettingsBackedWorkflow,
  type FeatureSettingsController,
  type StillOnFeatureSettings,
} from './feature_settings';
import { logFailures } from './log_failures';
import type { MaintenanceWorkflowTarget } from './managed_workflow_targets';
import { prepareDataStreamsForReset, resetDataStreams } from './reset_data_streams';
import { collectResetSnapshot } from './reset_snapshot';
import { deleteV2Rules } from './rules';
import {
  EXECUTIONS_CANCELLED_NOT_COUNTED,
  emptySummary,
  normalizeState,
  normalizeSummary,
  type IMaintenanceStateStore,
  type LoadedMaintenanceState,
} from './state_store';
import { toMessage } from './to_message';
import { mergeTargets, restoreWorkflowsAfterReset, sweepWorkflows } from './workflows';

/** The toggles of `toggles` that `removed` does not list, per toggle kind. */
const subtractToggles = (
  toggles: StillOnFeatureSettings,
  removed: StillOnFeatureSettings
): StillOnFeatureSettings => ({
  ...toggles,
  continuousOnboardingSpaceIds: toggles.continuousOnboardingSpaceIds.filter(
    (spaceId) => !removed.continuousOnboardingSpaceIds.includes(spaceId)
  ),
  scheduledDiscoveryEnabledSpaceIds: toggles.scheduledDiscoveryEnabledSpaceIds.filter(
    (spaceId) => !removed.scheduledDiscoveryEnabledSpaceIds.includes(spaceId)
  ),
});

/** What reset needs from the maintenance service, which owns the pause bookkeeping. */
export interface IResetMaintenanceDeps {
  log: Logger;
  server: SignificantEventsServer;
  getScopedClients: GetScopedClients;
  featureSettings: FeatureSettingsController;
  store: Pick<IMaintenanceStateStore, 'readState' | 'writeState' | 'deleteState'>;
  /** Writes `paused` for a space before any side effect; a no-op when it is already paused. */
  persistPausedIntent(params: {
    spaceId: SpaceId;
    existing: LoadedMaintenanceState | undefined;
    actor: string | undefined;
    operation: 'reset';
  }): Promise<void>;
}

/**
 * Reset step: snapshot every knowledge indicator / stored query, union their
 * backing rules with the rules pause had disabled and any tag-owned orphans,
 * and delete them all. Best-effort; every failure is recorded, never thrown.
 * `remainingRuleIds` are pause-disabled rules that were not deleted; they stay
 * in the inventory so Resume can re-enable them or a later Reset retry them.
 */
const deleteOwnedRules = async ({
  getScopedClients,
  request,
  previousRuleIds,
  failures,
}: {
  getScopedClients: GetScopedClients;
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
    snapshot.ruleIds.forEach((ruleId) => ruleIds.add(ruleId));
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

/**
 * Clears the current space's generated data, keeping shared streams and other spaces intact.
 * Intent and recovery inventory are durable before cleanup; only pre-cleanup errors roll back.
 */
export const createResetRunner = ({
  log,
  server,
  getScopedClients,
  featureSettings,
  store,
  persistPausedIntent,
}: IResetMaintenanceDeps): ((params: {
  request: KibanaRequest;
  updatedBy?: string;
}) => Promise<SignificantEventsMaintenanceSummary>) => {
  const { readState, writeState, deleteState } = store;

  return async ({ request, updatedBy }) => {
    const { spaceId } = request;
    const existing = await readState(spaceId);
    const failures: SignificantEventsMaintenanceFailure[] = [];
    const mgmt = server.workflowsManagement?.management;
    const pausedByReset = normalizeState(existing?.state) !== 'paused';
    let newlyDisabled: MaintenanceWorkflowTarget[] = [];
    let togglesBefore = emptyStillOn();
    let settingsStillOn = emptyStillOn();
    let recoveryWorkflows = existing?.disabledWorkflows ?? [];

    const rollback = async (): Promise<void> => {
      if (!pausedByReset) {
        // Keep a preceding user pause, recording any extra workflows this sweep disabled.
        if (existing && newlyDisabled.length > 0) {
          await writeState(spaceId, {
            ...existing,
            disabledWorkflows: mergeTargets(existing.disabledWorkflows, newlyDisabled),
          });
        }
        return;
      }

      const togglesNotRestored = await featureSettings.restoreTogglesOn({
        request,
        toggles: togglesBefore,
        failures,
      });
      const failedWorkflows = await restoreWorkflowsAfterReset({
        mgmt,
        workflows: newlyDisabled,
        settingsStillOn: subtractToggles(togglesBefore, togglesNotRestored),
        request,
        failures,
      });
      const withheldWorkflows = newlyDisabled.filter(
        (workflow) =>
          (isContinuousOnboardingWorkflowId(workflow.id) ||
            isScheduledDiscoveryWorkflowId(workflow.id)) &&
          shouldRestoreSettingsBackedWorkflow(workflow, togglesNotRestored)
      );
      const continuousNotRestored =
        togglesNotRestored.continuousOnboardingSpaceIds.includes(spaceId);
      const remainingWorkflows = mergeTargets(
        existing?.disabledWorkflows ?? [],
        mergeTargets(
          mergeTargets(failedWorkflows, withheldWorkflows),
          continuousNotRestored ? [continuousOnboardingWorkflowTarget(spaceId)] : []
        )
      );
      const pausedSettings = togglesNotRestored.scheduledDiscoveryEnabledSpaceIds.includes(spaceId)
        ? {
            continuousOnboardingWasEnabled: false,
            scheduledDiscoveryEnabledSpaceIds: [spaceId],
          }
        : existing?.pausedSettings;
      if (!existing && remainingWorkflows.length === 0 && !pausedSettings) {
        await deleteState(spaceId);
      } else {
        await writeState(spaceId, {
          state: 'enabled',
          updatedAt: new Date().toISOString(),
          updatedBy: existing?.updatedBy,
          disabledWorkflows: remainingWorkflows,
          disabledRules: existing?.disabledRules ?? [],
          pausedSettings,
          lastSummary: normalizeSummary(existing?.lastSummary) ?? emptySummary('enabled'),
        });
      }
    };

    try {
      await persistPausedIntent({ spaceId, existing, actor: updatedBy, operation: 'reset' });
      togglesBefore = await featureSettings.readTogglesOn({ request, spaceIds: [spaceId] });
      newlyDisabled = await sweepWorkflows({ mgmt, spaceIds: [spaceId], request, failures });
      settingsStillOn = await featureSettings.reassertFeatureSettingsOff({
        request,
        spaceIds: [spaceId],
        failures,
      });
      recoveryWorkflows = mergeTargets(recoveryWorkflows, newlyDisabled);
      await writeState(spaceId, {
        state: 'paused',
        updatedAt: new Date().toISOString(),
        updatedBy,
        disabledWorkflows: recoveryWorkflows,
        disabledRules: existing?.disabledRules ?? [],
        pausedSettings: existing?.pausedSettings,
        lastSummary: normalizeSummary(existing?.lastSummary) ?? emptySummary('paused'),
      });
    } catch (abortError) {
      try {
        await rollback();
      } catch (rollbackError) {
        log.error(
          `Significant Events reset could not restore space "${spaceId}" after aborting: ${toMessage(
            rollbackError
          )}. Resume it or run Reset again.`
        );
      }
      logFailures(
        log,
        `Significant Events reset aborted in space "${spaceId}" before cleanup`,
        failures
      );
      throw abortError;
    }

    // From here on cleanup is best-effort, with no rollback of completed deletions.
    const esClient = server.core.elasticsearch.client.asScoped(request).asCurrentUser;
    const preparedStreams = await prepareDataStreamsForReset({
      esClient,
      internalEsClient: server.core.elasticsearch.client.asInternalUser,
      dataStreams: server.core.dataStreams,
      failures,
    });
    const ruleFailures: SignificantEventsMaintenanceFailure[] = [];
    const { knowledgeIndicators, storedQueries, rules, remainingRuleIds } = await deleteOwnedRules({
      getScopedClients,
      request,
      previousRuleIds: (existing?.disabledRules ?? []).map(({ id }) => id),
      failures: ruleFailures,
    });
    failures.push(...ruleFailures.map((failure) => ({ ...failure, spaceId })));
    const { affected, completed } = await resetDataStreams({
      esClient,
      spaceId,
      preparedStreams,
      failures,
    });
    const indicatorsWiped = completed.has(KNOWLEDGE_INDICATORS_DATA_STREAM);
    const remainingWorkflows = await restoreWorkflowsAfterReset({
      mgmt,
      workflows: recoveryWorkflows,
      settingsStillOn,
      request,
      failures,
    });
    const remainingRules = remainingRuleIds.map((id) => ({ id, spaceId }));
    const summary: SignificantEventsMaintenanceSummary = {
      state: 'enabled',
      executionsCancelled: EXECUTIONS_CANCELLED_NOT_COUNTED,
      workflowsDisabled: remainingWorkflows.length,
      rulesDisabled: remainingRules.length,
      deleted: {
        knowledgeIndicators: indicatorsWiped ? knowledgeIndicators : 0,
        storedQueries: indicatorsWiped ? storedQueries : 0,
        rules,
        dataStreams: affected.size,
      },
      partialFailures: failures,
    };

    const persistEnabled = () =>
      writeState(spaceId, {
        state: 'enabled',
        updatedAt: new Date().toISOString(),
        updatedBy,
        disabledWorkflows: remainingWorkflows,
        disabledRules: remainingRules,
        lastSummary: summary,
      });
    try {
      if (!existing && remainingWorkflows.length === 0 && remainingRules.length === 0) {
        try {
          await deleteState(spaceId);
        } catch (deleteError) {
          log.warn(
            `Significant Events reset could not remove the maintenance document of space "${spaceId}": ${toMessage(
              deleteError
            )}`
          );
          await persistEnabled();
        }
      } else {
        await persistEnabled();
      }
    } catch (writeError) {
      logFailures(
        log,
        `Significant Events reset persist failed after cleanup in space "${spaceId}": ${toMessage(
          writeError
        )}. Run Reset again to return the space to enabled.`,
        failures
      );
      throw writeError;
    }

    logFailures(
      log,
      `Significant Events reset completed in space "${spaceId}" with ${failures.length} failure(s)`,
      failures
    );
    return summary;
  };
};
