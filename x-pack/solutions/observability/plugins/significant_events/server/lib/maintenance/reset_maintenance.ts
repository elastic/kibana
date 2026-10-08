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
  emptyStillOn,
  isContinuousOnboardingWorkflowId,
  isScheduledDiscoveryWorkflowId,
  requestForSpace,
  shouldRestoreSettingsBackedWorkflow,
  type FeatureSettingsController,
  type StillOnFeatureSettings,
} from './feature_settings';
import { logFailures } from './log_failures';
import type { MaintenanceWorkflowTarget } from './managed_workflow_targets';
import { resetDataStreams } from './reset_data_streams';
import { collectResetSnapshot } from './reset_snapshot';
import { deleteV2Rules } from './rules';
import { runForEachSpace, throwSpaceFailures } from './run_for_each_space';
import { requireAllSpaceIds } from './spaces';
import {
  EXECUTIONS_CANCELLED_NOT_COUNTED,
  emptySummary,
  normalizeState,
  normalizeSummary,
  type IMaintenanceStateStore,
  type LoadedMaintenanceState,
  type MaintenanceRuleTarget,
} from './state_store';
import { toMessage } from './to_message';
import { mergeTargets, restoreWorkflowsAfterReset, sweepWorkflows } from './workflows';

/**
 * The failures a space's own document should show: those not tied to a space (data streams,
 * snapshot) and those of that space, so other spaces' failures don't appear as its own.
 */
const failuresOfSpace = (
  failures: SignificantEventsMaintenanceFailure[],
  spaceId: SpaceId
): SignificantEventsMaintenanceFailure[] =>
  failures.filter((failure) => failure.spaceId === undefined || failure.spaceId === spaceId);

/** The toggles of `toggles` that belong to spaces `keep` accepts. */
const keepSpaces = (
  toggles: StillOnFeatureSettings,
  keep: (spaceId: SpaceId) => boolean
): StillOnFeatureSettings => ({
  ...toggles,
  continuousOnboardingSpaceIds: toggles.continuousOnboardingSpaceIds.filter(keep),
  scheduledDiscoveryEnabledSpaceIds: toggles.scheduledDiscoveryEnabledSpaceIds.filter(keep),
});

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

/** Reset step: delete every investigation across spaces; returns how many were deleted. */
const deleteInvestigations = async ({
  server,
  failures,
}: {
  server: SignificantEventsServer;
  failures: SignificantEventsMaintenanceFailure[];
}): Promise<number> => {
  if (!server.nightshiftInvestigations) {
    failures.push({ target: 'investigations', error: 'Investigations plugin is not available' });
    return 0;
  }
  try {
    const result = await server.nightshiftInvestigations.deleteAllInvestigations();
    failures.push(
      ...result.failures.map(({ id, spaceId, error }) => ({
        target: `investigation:${id}@${spaceId}`,
        spaceId,
        error,
      }))
    );
    return result.deleted;
  } catch (error) {
    failures.push({ target: 'investigations', error: toMessage(error) });
    return 0;
  }
};

/**
 * Destructively clears all Significant Events data across every space and returns every space
 * to enabled. The phases, in order:
 *
 * 1. Pause every space through its own document, so nothing starts new work against data
 *    that is about to be deleted.
 * 2. Sweep the workflows and Settings toggles of every space and persist what was swept, so an
 *    interrupted reset leaves Resume (or a repeated Reset) the inventory to restore.
 * 3. Delete rules, investigations and data streams, then re-enable the workflows.
 * 4. Return every space to enabled, keeping only what could not be restored.
 *
 * Phases 1 and 2 are all-or-nothing: if any step throws before the data is touched, the
 * workflows, toggles and pauses reset applied are rolled back. From phase 3 on the data is
 * already being deleted, so failures are recorded and reported instead.
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
    const failures: SignificantEventsMaintenanceFailure[] = [];

    // The list must be complete: a space that is missed would keep starting work against data
    // that is being deleted. A space without a document gets one, and that document is removed
    // again once nothing is left to restore.
    const allSpaceIds = await requireAllSpaceIds(server);
    const existingBySpace = new Map<SpaceId, LoadedMaintenanceState | undefined>(
      await Promise.all(
        allSpaceIds.map(
          async (spaceId): Promise<[SpaceId, LoadedMaintenanceState | undefined]> => [
            spaceId,
            await readState(spaceId),
          ]
        )
      )
    );
    const createdSpaceIds = new Set(
      allSpaceIds.filter((spaceId) => existingBySpace.get(spaceId) === undefined)
    );
    const mgmt = server.workflowsManagement?.management;

    // Phases 1 and 2 state, kept outside the try so the rollback can see how far they got.
    // Only spaces reset moved from enabled to paused are rolled back: a space a user paused
    // keeps its pause and its disabled workflows.
    const pausedByReset = new Set<SpaceId>();
    let newlyDisabled: MaintenanceWorkflowTarget[] = [];
    let togglesBefore = emptyStillOn();
    let settingsStillOn = togglesBefore;
    let recoveryWorkflows: MaintenanceWorkflowTarget[] = [];

    /** Phase 1 and 2 undo: toggles and workflows first, then each space's document. */
    const rollback = async (): Promise<void> => {
      const releasedSpaces = [...pausedByReset];
      const toggles = keepSpaces(togglesBefore, (spaceId) => pausedByReset.has(spaceId));
      const togglesNotRestored = await featureSettings.restoreTogglesOn({
        request,
        toggles,
        failures,
      });
      const toRestore = newlyDisabled.filter(({ spaceId }) => pausedByReset.has(spaceId));
      const failedWorkflows = await restoreWorkflowsAfterReset({
        mgmt,
        workflows: toRestore,
        // A settings-backed workflow comes back only where its toggle is back on.
        settingsStillOn: subtractToggles(toggles, togglesNotRestored),
        request,
        failures,
      });
      // A settings-backed workflow whose toggle could not be turned back on stays off with
      // it, and is recorded so Resume restores both together.
      const withheldWorkflows = toRestore.filter(
        (workflow) =>
          (isContinuousOnboardingWorkflowId(workflow.id) ||
            isScheduledDiscoveryWorkflowId(workflow.id)) &&
          shouldRestoreSettingsBackedWorkflow(workflow, togglesNotRestored)
      );
      const remainingWorkflows = mergeTargets(failedWorkflows, withheldWorkflows);

      const stuck = await runForEachSpace({
        spaceIds: releasedSpaces,
        run: async (spaceId) => {
          const previous = existingBySpace.get(spaceId);
          const spaceWorkflows = mergeTargets(
            previous?.disabledWorkflows ?? [],
            remainingWorkflows.filter((workflow) => workflow.spaceId === spaceId)
          );
          const scheduledNotRestored =
            togglesNotRestored.scheduledDiscoveryEnabledSpaceIds.includes(spaceId);
          const pausedSettings = scheduledNotRestored
            ? {
                continuousOnboardingWasEnabled: false,
                scheduledDiscoveryEnabledSpaceIds: [
                  ...new Set([
                    ...(previous?.pausedSettings?.scheduledDiscoveryEnabledSpaceIds ?? []),
                    spaceId,
                  ]),
                ],
              }
            : previous?.pausedSettings;
          if (!previous && spaceWorkflows.length === 0 && !pausedSettings) {
            await deleteState(spaceId);
            return;
          }
          await writeState(spaceId, {
            state: 'enabled',
            updatedAt: new Date().toISOString(),
            updatedBy: previous?.updatedBy,
            disabledWorkflows: spaceWorkflows,
            disabledRules: previous?.disabledRules ?? [],
            pausedSettings,
            lastSummary: normalizeSummary(previous?.lastSummary) ?? emptySummary('enabled'),
          });
        },
      });
      stuck.forEach(({ spaceId, error }) =>
        log.error(
          `Significant Events reset could not release the pause of space "${spaceId}" after aborting: ${toMessage(
            error
          )}`
        )
      );
      logFailures(
        log,
        'Significant Events reset aborted before destructive cleanup; rolled back its sweep',
        failures
      );
      if (stuck.length > 0) {
        log.error(
          `Significant Events reset left space(s) paused: ${stuck
            .map(({ spaceId }) => `"${spaceId}"`)
            .join(', ')}. Resume them or run Reset again.`
        );
      }
    };

    try {
      // Phase 1: pause every space.
      for (const spaceId of allSpaceIds) {
        const existing = existingBySpace.get(spaceId);
        // Recorded before the write: a write that landed but whose response was lost must
        // still be rolled back. A space that was already paused is not ours to release.
        if (normalizeState(existing?.state) !== 'paused') {
          pausedByReset.add(spaceId);
        }
        await persistPausedIntent({
          spaceId,
          existing,
          actor: updatedBy,
          operation: 'reset',
        });
      }

      // Phase 2: sweep every space, not only those the caller can see, since every space was
      // just marked paused. The toggles are read first: Reset turns them off for good, so an
      // abort needs to know which ones to turn back on.
      togglesBefore = await featureSettings.readTogglesOn({ request, spaceIds: allSpaceIds });
      newlyDisabled = await sweepWorkflows({ mgmt, spaceIds: allSpaceIds, request, failures });
      settingsStillOn = await featureSettings.reassertFeatureSettingsOff({
        request,
        spaceIds: allSpaceIds,
        failures,
      });
      // Persist the swept inventory before destroying data: a later sweep only records what it
      // toggles itself.
      recoveryWorkflows = mergeTargets(
        allSpaceIds.flatMap((spaceId) => existingBySpace.get(spaceId)?.disabledWorkflows ?? []),
        newlyDisabled
      );
      for (const sweptSpaceId of new Set(newlyDisabled.map(({ spaceId }) => spaceId))) {
        const existing = existingBySpace.get(sweptSpaceId);
        await writeState(sweptSpaceId, {
          state: 'paused',
          updatedAt: new Date().toISOString(),
          updatedBy,
          disabledWorkflows: recoveryWorkflows.filter(({ spaceId }) => spaceId === sweptSpaceId),
          disabledRules: existing?.disabledRules ?? [],
          pausedSettings: existing?.pausedSettings,
          lastSummary: normalizeSummary(existing?.lastSummary) ?? emptySummary('paused'),
        });
      }
    } catch (abortError) {
      await rollback();
      throw abortError;
    }

    // Phase 3: from here on the data is being deleted, so nothing is rolled back.
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

    const previousRules: MaintenanceRuleTarget[] = allSpaceIds.flatMap(
      (spaceId) => existingBySpace.get(spaceId)?.disabledRules ?? []
    );
    // A recorded rule can belong to a space that no longer exists, so its space is swept too.
    const ruleSpaces = [
      ...new Set([...allSpaceIds, ...previousRules.map(({ spaceId }) => spaceId)]),
    ];
    const deletedRules = await Promise.all(
      ruleSpaces.map(async (spaceId) => {
        // Rule failures carry no space of their own, so they are tagged here.
        const spaceFailures: SignificantEventsMaintenanceFailure[] = [];
        const result = await deleteOwnedRules({
          getScopedClients,
          request: requestForSpace(request, spaceId),
          previousRuleIds: previousRules
            .filter((rule) => rule.spaceId === spaceId)
            .map(({ id }) => id),
          failures: spaceFailures,
        });
        failures.push(...spaceFailures.map((failure) => ({ ...failure, spaceId })));
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
    const investigations = await deleteInvestigations({ server, failures });
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

    // Phase 4: every space goes back to enabled. What could not be restored stays on its own
    // space's document so a later Resume there can retry it. A document this reset created for
    // a space that was never paused is removed instead of left empty. A space only needs its
    // own pass when it held something to restore, which can be a space outside `allSpaceIds`.
    const finalSpaceIds = new Set([
      ...allSpaceIds,
      ...remainingWorkflows.map(({ spaceId }) => spaceId),
      ...remainingRules.map(({ spaceId }) => spaceId),
    ]);
    const writeFailures = await runForEachSpace({
      spaceIds: finalSpaceIds,
      run: async (spaceId) => {
        const spaceWorkflows = remainingWorkflows.filter((target) => target.spaceId === spaceId);
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
            // Fall through to an enabled document: a leftover paused one would keep the space blocked.
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
    throwSpaceFailures({
      action: 'Significant Events reset persist',
      failures: writeFailures,
      hint: 'The data was already deleted and these spaces stay paused; run Reset again to return them to enabled',
    });

    logFailures(
      log,
      `Significant Events reset completed with ${failures.length} failure(s)`,
      failures
    );
    return summary;
  };
};
