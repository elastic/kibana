/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import type { SignificantEventsMaintenanceService } from '../../../lib/maintenance/maintenance_service';
import type { KnowledgeIndicatorClient } from '../../../lib/knowledge_indicators/knowledge_indicator_client/knowledge_indicator_client';
import { listAllSources } from '../../utils/list_all_sources';

interface OnboardingCancel {
  cancel: (args: { streamName: string; request: KibanaRequest }) => Promise<unknown>;
}

type CatalogKiClient = Pick<
  KnowledgeIndicatorClient,
  | 'setSourceRulesEnabled'
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
  onboardingClient?: OnboardingCancel;
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
 * Disabled sources have their rules disabled and any running onboarding cancelled.
 * Enabled sources have their rules enabled, unless maintenance is paused.
 * Ids that still have knowledge indicators or owned rules but no catalog row are retired.
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
  onboardingClient?: OnboardingCancel;
  maintenanceService: Pick<SignificantEventsMaintenanceService, 'getState'>;
  request: KibanaRequest;
}): Promise<{ sources: NightshiftSource[]; reconcileIds: string[] }> {
  const sources = await listAllSources(sourcesClient);
  const catalogIds = new Set(sources.map((source) => source.id));
  const maintenanceState = await maintenanceService.getState({ request });

  for (const source of sources) {
    if (!source.enabled) {
      await kiClient.setSourceRulesEnabled(source.id, false);
      if (onboardingClient) {
        await onboardingClient.cancel({ streamName: source.id, request });
      }
      continue;
    }
    if (maintenanceState !== 'paused') {
      await kiClient.setSourceRulesEnabled(source.id, true);
    }
  }

  const reconcileIds = await kiClient.getStreamNamesToReconcile();
  const survivingReconcileIds: string[] = [];
  for (const sourceId of reconcileIds) {
    if (catalogIds.has(sourceId)) {
      survivingReconcileIds.push(sourceId);
      continue;
    }
    await retireSourceKnowledge({ sourceId, kiClient, onboardingClient, request });
  }

  return { sources, reconcileIds: survivingReconcileIds };
}
