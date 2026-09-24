/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import type { SignificantEventsMaintenanceService } from '../../../lib/maintenance/maintenance_service';
import type { KnowledgeIndicatorClient } from '../../../lib/knowledge_indicators/knowledge_indicator_client/knowledge_indicator_client';
import { parseStreamNameFromConcurrencyKey } from '../../../lib/workflows/onboarding_workflow_client';
import { listAllSources } from '../../utils/list_all_sources';

interface OnboardingClient {
  cancel: (args: { streamName: string; request: KibanaRequest }) => Promise<unknown>;
  getNonTerminalExecutions?: () => Promise<WorkflowExecutionListItemDto[]>;
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
 * Drops onboarding, owned rules, and knowledge indicators for a source id
 * that is no longer in the catalog. The view and the saved object are kept.
 */
export async function retireSourceKnowledge({
  sourceId,
  kiClient,
  onboardingClient,
  request,
}: {
  sourceId: string;
  kiClient: Pick<CatalogKiClient, 'deleteOwnedRules' | 'deleteAllQueries' | 'deleteIndicators'>;
  onboardingClient?: OnboardingClient;
  request: KibanaRequest;
}): Promise<void> {
  if (onboardingClient) {
    await onboardingClient.cancel({ streamName: sourceId, request });
  }
  await kiClient.deleteOwnedRules(sourceId);
  await kiClient.deleteAllQueries(sourceId);
  await kiClient.deleteIndicators(sourceId);
}

/**
 * Aligns owned rules and onboarding with the source catalog.
 * A disabled source with a running onboarding execution has that run cancelled
 * before its owned rules are disabled.
 * Enabled sources that own rules have those rules enabled, unless maintenance is paused.
 * Ids that still have knowledge indicators or owned rules but no catalog row are retired.
 * A running execution whose source is gone is retired only in the default space,
 * where those executions are stored.
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
  const ownedRuleSourceIds = new Set(await kiClient.findStreamNamesWithOwnedRules());
  const maintenanceState = await maintenanceService.getState({ request });
  const runningSourceIds = await loadRunningSourceIds(onboardingClient);

  for (const source of sources) {
    if (!source.enabled) {
      if (onboardingClient && runningSourceIds.has(source.id)) {
        await onboardingClient.cancel({ streamName: source.id, request });
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

  const reconcileIds = await kiClient.getStreamNamesToReconcile();
  const survivingReconcileIds: string[] = [];
  const retiredIds = new Set<string>();
  for (const sourceId of reconcileIds) {
    if (catalogIds.has(sourceId)) {
      survivingReconcileIds.push(sourceId);
      continue;
    }
    retiredIds.add(sourceId);
    await retireSourceKnowledge({ sourceId, kiClient, onboardingClient, request });
  }

  // Executions are stored in the default space and carry no space id. Another space's
  // catalog must not treat those runs as deleted sources.
  if (request.spaceId === DEFAULT_SPACE_ID) {
    for (const sourceId of runningSourceIds) {
      if (catalogIds.has(sourceId) || retiredIds.has(sourceId)) {
        continue;
      }
      retiredIds.add(sourceId);
      await retireSourceKnowledge({ sourceId, kiClient, onboardingClient, request });
    }
  }

  return { sources, reconcileIds: survivingReconcileIds };
}

async function loadRunningSourceIds(onboardingClient?: OnboardingClient): Promise<Set<string>> {
  const executions = (await onboardingClient?.getNonTerminalExecutions?.()) ?? [];
  const sourceIds = new Set<string>();
  for (const execution of executions) {
    if (!execution.concurrencyGroupKey) {
      continue;
    }
    const sourceId = parseStreamNameFromConcurrencyKey(execution.concurrencyGroupKey);
    if (sourceId) {
      sourceIds.add(sourceId);
    }
  }
  return sourceIds;
}
