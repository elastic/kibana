/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import type { SignificantEventsMaintenanceService } from '../../../lib/maintenance/maintenance_service';
import type { KnowledgeIndicatorClient } from '../../../lib/knowledge_indicators/knowledge_indicator_client/knowledge_indicator_client';
import { parseSourceSlugFromConcurrencyKey } from '../../../lib/workflows/onboarding_workflow_client';
import { listAllSources } from '../../utils/list_all_sources';

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
 * Drops owned rules, queries, and knowledge indicators for a source id that is
 * no longer in the catalog. The view and the saved object are kept.
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
    if (!source.enabled) {
      if (onboardingClient && runningSourceSlugs.has(source.slug)) {
        await onboardingClient.cancelBySourceSlug({ sourceSlug: source.slug, request });
      }
      if (ownedRuleSourceIds.has(source.id)) {
        await kiClient.setSourceRulesEnabled(source.id, false);
      }
      continue;
    }
    if (maintenanceState !== 'paused' && ownedRuleSourceIds.has(source.id)) {
      await kiClient.setSourceRulesEnabled(source.id, true);
    }
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
