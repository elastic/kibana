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
import { parseSourceSlugFromConcurrencyKey } from '../../../lib/workflows/onboarding_workflow_client';
import { listAllSources } from '../../utils/list_all_sources';
import type { GetScopedClients } from '../../types';

interface OnboardingClient {
  cancelBySourceSlug: (args: { sourceSlug: string; request: KibanaRequest }) => Promise<unknown>;
  getNonTerminalExecutions?: (args: {
    request: KibanaRequest;
  }) => Promise<WorkflowExecutionListItemDto[]>;
}

type CatalogKiClient = Pick<
  KnowledgeIndicatorClient,
  | 'setSourceRulesEnabled'
  | 'findStreamNamesWithOwnedRules'
  | 'getStreamNamesToReconcile'
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
}: {
  source: Pick<NightshiftSource, 'id' | 'slug'>;
  kiClient: Pick<CatalogKiClient, 'deleteOwnedRules' | 'deleteAllQueries' | 'deleteIndicators'>;
  onboardingClient?: Pick<OnboardingClient, 'cancelBySourceSlug'>;
  request: KibanaRequest;
}): Promise<void> {
  await cancelOnboardingThen({
    onboardingClient,
    sourceSlug: source.slug,
    request,
    cleanup: () => retireSourceKnowledge({ sourceId: source.id, kiClient }),
  });
}

/**
 * Applies the enabled flag of one source to its onboarding and owned rules. A disabled source has
 * its run cancelled, then its rules disabled even when the cancel fails; an enabled one gets its
 * rules back unless maintenance is paused.
 */
async function applySourceEnabled({
  source,
  kiClient,
  onboardingClient,
  maintenanceState,
  request,
  mayHaveRunningOnboarding = true,
  mayOwnRules = true,
}: {
  source: Pick<NightshiftSource, 'id' | 'slug' | 'enabled'>;
  kiClient: Pick<CatalogKiClient, 'setSourceRulesEnabled'>;
  onboardingClient?: Pick<OnboardingClient, 'cancelBySourceSlug'>;
  maintenanceState: SignificantEventsMaintenanceState;
  request: KibanaRequest;
  /** `false` skips the cancel. The reconcile knows which runs are going; the listener does not. */
  mayHaveRunningOnboarding?: boolean;
  /** `false` skips the rule toggle. The reconcile knows which sources own rules; the listener does not. */
  mayOwnRules?: boolean;
}): Promise<void> {
  if (!source.enabled) {
    await cancelOnboardingThen({
      onboardingClient: mayHaveRunningOnboarding ? onboardingClient : undefined,
      sourceSlug: source.slug,
      request,
      cleanup: async () => {
        if (mayOwnRules) {
          await kiClient.setSourceRulesEnabled(source.id, false);
        }
      },
    });
    return;
  }
  // A pause keeps rules off. Resume only restores the rules the pause disabled, so a source
  // enabled meanwhile gets its rules back from the next catalog reconcile.
  if (maintenanceState !== 'paused' && mayOwnRules) {
    await kiClient.setSourceRulesEnabled(source.id, true);
  }
}

/**
 * Applies a source change as soon as it is committed, in the space of the request that made it,
 * instead of waiting for the next catalog reconcile. A deleted source loses its knowledge, and a
 * disabled or re-enabled one has its onboarding and owned rules aligned. Other edits are left to
 * the reconcile.
 */
export const createSourceChangeListener =
  ({
    getScopedClients,
    onboardingClient,
    maintenanceService,
  }: {
    getScopedClients: GetScopedClients;
    onboardingClient?: Pick<OnboardingClient, 'cancelBySourceSlug'>;
    maintenanceService: Pick<SignificantEventsMaintenanceService, 'getState'>;
  }): SourceChangeListener =>
  async (event) => {
    const isDeleted = event.type === 'deleted';
    const isEnabledToggled =
      event.type === 'updated' && event.previous.enabled !== event.source.enabled;
    if (!isDeleted && !isEnabledToggled) {
      return;
    }

    const { getKnowledgeIndicatorClient } = await getScopedClients({ request: event.request });
    const kiClient = await getKnowledgeIndicatorClient();
    if (isDeleted) {
      await resetSourceKnowledge({
        source: event.source,
        kiClient,
        onboardingClient,
        request: event.request,
      });
      return;
    }
    await applySourceEnabled({
      source: event.source,
      kiClient,
      onboardingClient,
      maintenanceState: await maintenanceService.getState({ request: event.request }),
      request: event.request,
    });
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
}: {
  sourcesClient: SourcesClient;
  kiClient: CatalogKiClient;
  onboardingClient?: OnboardingClient;
  maintenanceService: Pick<SignificantEventsMaintenanceService, 'getState'>;
  request: KibanaRequest;
}): Promise<{ sources: NightshiftSource[]; reconcileIds: string[] }> {
  const sources = await listAllSources(sourcesClient);
  const catalogIds = new Set(sources.map((source) => source.id));
  const catalogSlugs = new Set(sources.map((source) => source.slug));
  const ownedRuleSourceIds = new Set(await kiClient.findStreamNamesWithOwnedRules());
  const maintenanceState = await maintenanceService.getState({ request });
  const runningSourceSlugs = await loadRunningSourceSlugs(onboardingClient, request);

  for (const source of sources) {
    await applySourceEnabled({
      source,
      kiClient,
      onboardingClient,
      maintenanceState,
      request,
      mayHaveRunningOnboarding: runningSourceSlugs.has(source.slug),
      mayOwnRules: ownedRuleSourceIds.has(source.id),
    });
  }

  // Cancel before retiring: a run left going could write indicators or rules back for a
  // source that is gone.
  if (onboardingClient) {
    for (const sourceSlug of runningSourceSlugs) {
      if (catalogSlugs.has(sourceSlug)) {
        continue;
      }
      await onboardingClient.cancelBySourceSlug({ sourceSlug, request });
    }
  }

  const reconcileIds = await kiClient.getStreamNamesToReconcile();
  const survivingReconcileIds: string[] = [];
  for (const sourceId of reconcileIds) {
    if (catalogIds.has(sourceId)) {
      survivingReconcileIds.push(sourceId);
      continue;
    }
    await retireSourceKnowledge({ sourceId, kiClient });
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
    const sourceSlug = parseSourceSlugFromConcurrencyKey(execution.concurrencyGroupKey);
    if (sourceSlug) {
      sourceSlugs.add(sourceSlug);
    }
  }
  return sourceSlugs;
}
