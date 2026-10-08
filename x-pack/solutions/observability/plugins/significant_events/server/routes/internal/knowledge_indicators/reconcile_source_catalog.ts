/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourceChangeListener, SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import type { SignificantEventsMaintenanceState } from '../../../../common/maintenance/state_machine';
import type { SignificantEventsMaintenanceService } from '../../../lib/maintenance/maintenance_service';
import type { KnowledgeIndicatorClient } from '../../../lib/knowledge_indicators/knowledge_indicator_client/knowledge_indicator_client';
import { parseSourceSlugFromKiConcurrencyKey } from '../../../lib/workflows/onboarding_workflow_client';
import { listAllSources } from '../../utils/list_all_sources';
import type { SourceKnowledgeStateClient } from '../../../lib/knowledge_indicators/source_knowledge_state';
import { StatusError } from '../../../lib/errors/status_error';

interface OnboardingClient {
  cancelBySourceSlug: (args: { sourceSlug: string; request: KibanaRequest }) => Promise<unknown>;
  getNonTerminalExecutions?: (args: {
    request: KibanaRequest;
  }) => Promise<WorkflowExecutionListItemDto[]>;
}

type CatalogKiClient = Pick<
  KnowledgeIndicatorClient,
  | 'setSourceRulesEnabled'
  | 'findSourceIdsWithOwnedRules'
  | 'getSourceIdsToReconcile'
  | 'deleteOwnedRules'
  | 'deleteAllQueries'
  | 'deleteIndicators'
>;

/**
 * Drops the owned rules, queries and knowledge indicators of a source id. Onboarding runs, the view
 * and the saved object are left alone. The reconcile calls it for ids that left the catalog, and
 * `resetSourceKnowledge` for a live or just-deleted source after cancelling its run.
 */
export async function retireSourceKnowledge({
  sourceId,
  kiClient,
}: {
  sourceId: string;
  kiClient: Pick<CatalogKiClient, 'deleteOwnedRules' | 'deleteAllQueries' | 'deleteIndicators'>;
}): Promise<void> {
  await kiClient.deleteOwnedRules(sourceId);
  await kiClient.deleteAllQueries(sourceId);
  await kiClient.deleteIndicators(sourceId);
}

/**
 * Cancels the source's onboarding run, then runs `cleanup` even when the cancel fails: skipping it
 * would leave a deleted or disabled source's rules firing. A cancel error is rethrown after the
 * cleanup, so callers still log it.
 */
async function cancelOnboardingThen({
  onboardingClient,
  sourceSlug,
  request,
  cleanup,
}: {
  onboardingClient?: Pick<OnboardingClient, 'cancelBySourceSlug'>;
  sourceSlug: string;
  request: KibanaRequest;
  cleanup: () => Promise<void>;
}): Promise<void> {
  let cancelError: unknown;
  try {
    // Cancel first: a run left going could write indicators or rules back after the cleanup.
    await onboardingClient?.cancelBySourceSlug({ sourceSlug, request });
  } catch (error) {
    cancelError = error;
  }
  // A `finally` would let a cleanup failure replace the cancel error the callers log.
  await cleanup();
  if (cancelError !== undefined) {
    throw cancelError;
  }
}

/**
 * Cancels the source's onboarding run, then drops its owned rules, queries and knowledge
 * indicators, even when the cancel fails. Runs when a source is deleted and when its knowledge is
 * reset; the view and the saved object are left to the caller.
 */
export async function resetSourceKnowledge({
  source,
  kiClient,
  onboardingClient,
  request,
  sourceKnowledgeState,
}: {
  source: Pick<NightshiftSource, 'id' | 'slug'>;
  kiClient: Pick<CatalogKiClient, 'deleteOwnedRules' | 'deleteAllQueries' | 'deleteIndicators'>;
  sourceKnowledgeState?: SourceKnowledgeStateClient;
  onboardingClient?: Pick<OnboardingClient, 'cancelBySourceSlug'>;
  request: KibanaRequest;
}): Promise<void> {
  await cancelOnboardingThen({
    onboardingClient,
    sourceSlug: source.slug,
    request,
    cleanup: () =>
      sourceKnowledgeState
        ? sourceKnowledgeState.runExclusive({
            sourceId: source.id,
            run: () => retireSourceKnowledge({ sourceId: source.id, kiClient }),
          })
        : retireSourceKnowledge({ sourceId: source.id, kiClient }),
  });
}

/** Invalidates an unapplied query revision before scheduling its replacement onboarding. */
export async function reconcileSourceRevision({
  source,
  sourcesClient,
  kiClient,
  onboardingClient,
  sourceKnowledgeState,
  scheduleSourceOnboarding,
  request,
}: {
  source: NightshiftSource;
  sourcesClient: SourcesClient;
  kiClient: CatalogKiClient;
  onboardingClient?: OnboardingClient;
  sourceKnowledgeState: SourceKnowledgeStateClient;
  scheduleSourceOnboarding?: (source: NightshiftSource) => Promise<boolean>;
  request: KibanaRequest;
}): Promise<void> {
  await sourceKnowledgeState.runExclusive({
    sourceId: source.id,
    run: async (state, checkpoint) => {
      // Another edit may have committed while this event was waiting for a write to finish.
      const { source: current } = await sourcesClient.get(source.id);
      const isRevisionChanged = state.revision !== current.esql_updated_at;
      if (isRevisionChanged) {
        // Every writer establishes the checkpoint before persisting knowledge, so an absent
        // checkpoint means there is no previous revision to clean up.
        if (state.revision !== undefined) {
          await resetSourceKnowledge({ source: current, kiClient, onboardingClient, request });
        }
        await checkpoint({ revision: current.esql_updated_at, onboardingScheduled: false });
      }
      if (
        current.enabled &&
        (isRevisionChanged || !state.onboardingScheduled) &&
        scheduleSourceOnboarding
      ) {
        const runningSlugs = await loadRunningSourceSlugs(onboardingClient, request);
        if (runningSlugs.has(current.slug)) {
          throw new StatusError('Waiting for the previous onboarding execution to finish', 409);
        }
        if (await scheduleSourceOnboarding(current)) {
          await checkpoint({ onboardingScheduled: true });
        }
      }
    },
  });
}

/**
 * Applies the enabled flag of one source to its onboarding and owned rules. A disabled source has
 * its run cancelled, then its rules disabled even when the cancel fails; an enabled one gets its
 * rules back unless maintenance is paused.
 */
export async function applySourceEnabled({
  source,
  kiClient,
  onboardingClient,
  getMaintenanceState,
  request,
  skipCancel = false,
  skipRuleToggle = false,
  sourceKnowledgeState,
}: {
  source: Pick<NightshiftSource, 'id' | 'slug' | 'enabled'>;
  kiClient: Pick<CatalogKiClient, 'setSourceRulesEnabled'>;
  onboardingClient?: Pick<OnboardingClient, 'cancelBySourceSlug'>;
  /** Read only when the source is enabled: a failed read must not stop a disable. */
  getMaintenanceState: () => Promise<SignificantEventsMaintenanceState>;
  request: KibanaRequest;
  /** The reconcile knows which runs are going and skips the cancel; the listener does not, so it cancels. */
  skipCancel?: boolean;
  /** The reconcile knows which sources own rules and skips the toggle; the listener does not, so it toggles. */
  skipRuleToggle?: boolean;
  sourceKnowledgeState?: SourceKnowledgeStateClient;
}): Promise<void> {
  if (sourceKnowledgeState) {
    // Cancel before waiting for the lease: a run holding it keeps writing until it is cancelled,
    // so cancelling inside the lease could wait on the very run it is meant to stop.
    let cancelError: unknown;
    if (!source.enabled && !skipCancel) {
      try {
        await onboardingClient?.cancelBySourceSlug({ sourceSlug: source.slug, request });
      } catch (error) {
        cancelError = error;
      }
    }
    await sourceKnowledgeState.runExclusive({
      sourceId: source.id,
      run: () =>
        applySourceEnabled({
          source,
          kiClient,
          onboardingClient,
          getMaintenanceState,
          request,
          skipCancel: true,
          skipRuleToggle,
        }),
    });
    if (cancelError !== undefined) {
      throw cancelError;
    }
    return;
  }
  if (!source.enabled) {
    await cancelOnboardingThen({
      onboardingClient: skipCancel ? undefined : onboardingClient,
      sourceSlug: source.slug,
      request,
      cleanup: async () => {
        if (!skipRuleToggle) {
          await kiClient.setSourceRulesEnabled(source.id, false);
        }
      },
    });
    return;
  }
  // While paused, rules stay off. After a resume, only the rules the pause disabled come back,
  // so a source enabled in between gets its rules from the next catalog reconcile.
  if (!skipRuleToggle && (await getMaintenanceState()) !== 'paused') {
    await kiClient.setSourceRulesEnabled(source.id, true);
  }
}

/** Queues source changes and enables periodic recovery independently so either can survive a failure. */
export const createSourceChangeListener =
  ({
    enqueueReconciliation,
    ensurePeriodicReconciliation,
  }: {
    enqueueReconciliation: (args: {
      sourceId: string;
      sourceSlug: string;
      request: KibanaRequest;
    }) => Promise<void>;
    ensurePeriodicReconciliation: (request: KibanaRequest) => Promise<void>;
  }): SourceChangeListener =>
  async (event) => {
    if (
      event.type === 'updated' &&
      event.previous.esql_updated_at === event.source.esql_updated_at &&
      event.previous.enabled === event.source.enabled
    ) {
      return;
    }
    const results = await Promise.allSettled([
      enqueueReconciliation({
        sourceId: event.source.id,
        sourceSlug: event.source.slug,
        request: event.request,
      }),
      ensurePeriodicReconciliation(event.request),
    ]);
    const failures = results.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : []
    );
    if (failures.length > 0) {
      throw failures.length === 1
        ? failures[0]
        : new AggregateError(failures, 'Failed to schedule source reconciliation');
    }
  };

/**
 * Aligns owned rules and onboarding with the source catalog of the request space.
 * A disabled source with a running onboarding execution has that run cancelled
 * before its owned rules are disabled.
 * Enabled sources that own rules have those rules enabled, unless maintenance is paused.
 * A running execution whose slug has no catalog row is cancelled. Executions are
 * keyed by slug and live in the request space, so they are matched against this
 * space's catalog only.
 * Ids that still have knowledge indicators or owned rules but no catalog row are
 * then retired.
 */
export async function reconcileSourceCatalog({
  sourcesClient,
  kiClient,
  onboardingClient,
  maintenanceService,
  request,
  sourceKnowledgeState,
  scheduleSourceOnboarding,
  maxScheduled,
}: {
  sourcesClient: SourcesClient;
  kiClient: CatalogKiClient;
  onboardingClient?: OnboardingClient;
  sourceKnowledgeState?: SourceKnowledgeStateClient;
  scheduleSourceOnboarding?: (source: NightshiftSource) => Promise<boolean>;
  /**
   * Caps concurrent onboarding runs for this sweep, counting the runs already going. Without it a
   * source with no checkpoint is scheduled here regardless of the continuous onboarding limit.
   */
  maxScheduled?: number;
  maintenanceService: Pick<SignificantEventsMaintenanceService, 'getState'>;
  request: KibanaRequest;
}): Promise<{ sources: NightshiftSource[]; reconcileIds: string[] }> {
  const [sources, ownedRuleIds, maintenanceState, runningSourceSlugs] = await Promise.all([
    listAllSources(sourcesClient),
    kiClient.findSourceIdsWithOwnedRules(),
    maintenanceService.getState({ request }),
    loadRunningSourceSlugs(onboardingClient, request),
  ]);
  let remainingSlots =
    maxScheduled === undefined ? Infinity : Math.max(0, maxScheduled - runningSourceSlugs.size);
  // Once the budget is spent the scheduler declines, which leaves the source unscheduled so the
  // next sweep picks it up.
  const scheduleWithinBudget = scheduleSourceOnboarding
    ? async (source: NightshiftSource): Promise<boolean> => {
        if (remainingSlots <= 0) {
          return false;
        }
        const scheduled = await scheduleSourceOnboarding(source);
        if (scheduled) {
          remainingSlots -= 1;
        }
        return scheduled;
      }
    : undefined;
  const catalogIds = new Set(sources.map((source) => source.id));
  const catalogSlugs = new Set(sources.map((source) => source.slug));
  const ownedRuleSourceIds = new Set(ownedRuleIds);

  // One failing source must not leave the others' rules firing or skip the steps below, so
  // failures are collected and thrown once everything else ran.
  const failures: unknown[] = [];
  for (const source of sources) {
    try {
      if (sourceKnowledgeState) {
        await reconcileSourceRevision({
          source,
          sourcesClient,
          kiClient,
          onboardingClient,
          sourceKnowledgeState,
          scheduleSourceOnboarding: scheduleWithinBudget,
          request,
        });
      }
      await applySourceEnabled({
        source,
        kiClient,
        onboardingClient,
        getMaintenanceState: () => Promise.resolve(maintenanceState),
        request,
        sourceKnowledgeState,
        skipCancel: !runningSourceSlugs.has(source.slug),
        skipRuleToggle: !ownedRuleSourceIds.has(source.id),
      });
    } catch (error) {
      // A 409 means a write holds the source's lease or its cancelled run is still winding down.
      // The next sweep retries it, and failing the sweep here would skip every other source too.
      if (!(error instanceof StatusError && error.statusCode === 409)) {
        failures.push(error);
      }
    }
  }

  // Cancel before retiring: a run left going could write indicators or rules back for a
  // source that is gone. A run that fails to cancel does not stop the retire: its slug cannot be
  // matched to a source id once the row is gone, and the next reconcile cancels and retires again.
  if (onboardingClient) {
    for (const sourceSlug of runningSourceSlugs) {
      if (catalogSlugs.has(sourceSlug)) {
        continue;
      }
      try {
        await onboardingClient.cancelBySourceSlug({ sourceSlug, request });
      } catch (error) {
        failures.push(error);
      }
    }
  }

  const reconcileIds = await kiClient.getSourceIdsToReconcile();
  const survivingReconcileIds: string[] = [];
  for (const sourceId of reconcileIds) {
    if (catalogIds.has(sourceId)) {
      survivingReconcileIds.push(sourceId);
      continue;
    }
    try {
      if (sourceKnowledgeState) {
        await sourceKnowledgeState.runExclusive({
          sourceId,
          run: () => retireSourceKnowledge({ sourceId, kiClient }),
        });
      } else {
        await retireSourceKnowledge({ sourceId, kiClient });
      }
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.length > 0) {
    throw failures.length === 1
      ? failures[0]
      : new AggregateError(failures, 'Failed to align several sources with the catalog');
  }

  return { sources, reconcileIds: survivingReconcileIds };
}

async function loadRunningSourceSlugs(
  onboardingClient: OnboardingClient | undefined,
  request: KibanaRequest
): Promise<Set<string>> {
  const executions = (await onboardingClient?.getNonTerminalExecutions?.({ request })) ?? [];
  const sourceSlugs = new Set<string>();
  for (const execution of executions) {
    if (!execution.concurrencyGroupKey) {
      continue;
    }
    const sourceSlug = parseSourceSlugFromKiConcurrencyKey(execution.concurrencyGroupKey);
    if (sourceSlug) {
      sourceSlugs.add(sourceSlug);
    }
  }
  return sourceSlugs;
}
