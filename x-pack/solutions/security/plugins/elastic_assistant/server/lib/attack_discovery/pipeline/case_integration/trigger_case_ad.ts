/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import { getIncrementalDelta, markAlertsProcessed } from '../incremental';
import { buildCaseAlertFilter } from '../../../../routes/attack_discovery/helpers/build_case_alert_filter';
import type { IncrementalAdConfig } from '../types';

export interface TriggerCaseAdParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  caseId: string;
  cases: CasesServerStart;
  config: IncrementalAdConfig;
  esClient: ElasticsearchClient;
  logger: Logger;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  spaceId: string;
  generateAttackDiscoveriesFn: (params: {
    actionsClient: PublicMethodsOf<ActionsClient>;
    config: {
      filter?: Record<string, unknown>;
      size: number;
      alertsIndexPattern: string;
    };
    esClient: ElasticsearchClient;
    logger: Logger;
    savedObjectsClient: SavedObjectsClientContract;
  }) => Promise<{
    attackDiscoveries: Array<{ alertIds: string[]; title: string }>;
    generationUuid: string;
  } | null>;
}

export interface TriggerCaseAdResult {
  readonly caseId: string;
  readonly triggered: boolean;
  readonly skipReason?: string;
  readonly deltaAlertCount: number;
  readonly generationUuid?: string;
  readonly discoveriesGenerated: number;
}

/**
 * Triggers incremental Attack Discovery for a specific case.
 *
 * Flow:
 * 1. Compute delta alert IDs (new alerts not yet analyzed)
 * 2. Build an IDs filter for the delta alerts
 * 3. Run AD generation scoped to those delta alerts
 * 4. Mark the delta alerts as processed
 * 5. Return results for case comment attachment
 */
export const triggerCaseAttackDiscovery = async ({
  actionsClient,
  caseId,
  cases,
  config,
  esClient,
  generateAttackDiscoveriesFn,
  logger,
  request,
  savedObjectsClient,
  spaceId,
}: TriggerCaseAdParams): Promise<TriggerCaseAdResult> => {
  const delta = await getIncrementalDelta({
    caseId,
    cases,
    config,
    esClient,
    logger,
    request,
    spaceId,
  });

  if (delta.skipped) {
    logger.debug(() => `triggerCaseAttackDiscovery: skipping case ${caseId}: ${delta.skipReason}`);

    return {
      caseId,
      triggered: false,
      skipReason: delta.skipReason,
      deltaAlertCount: delta.deltaAlertIds.length,
      discoveriesGenerated: 0,
    };
  }

  logger.info(
    `triggerCaseAttackDiscovery: running incremental AD for case ${caseId} with ${delta.deltaAlertIds.length} delta alerts`
  );

  const filter = buildCaseAlertFilter(delta.deltaAlertIds);

  try {
    const indexPattern =
      spaceId === 'default'
        ? '.alerts-security.alerts-default'
        : `.alerts-security.alerts-${spaceId}`;

    const adResult = await generateAttackDiscoveriesFn({
      actionsClient,
      config: {
        filter,
        size: delta.deltaAlertIds.length,
        alertsIndexPattern: indexPattern,
      },
      esClient,
      logger,
      savedObjectsClient,
    });

    await markAlertsProcessed({
      caseId,
      deltaAlertIds: delta.deltaAlertIds,
      esClient,
      generationUuid: delta.generationUuid,
      logger,
      spaceId,
    });

    if (!adResult) {
      logger.info(
        `triggerCaseAttackDiscovery: AD returned no discoveries for case ${caseId}, marking ${delta.deltaAlertIds.length} alerts as processed to avoid re-analysis`
      );
    }

    return {
      caseId,
      triggered: true,
      deltaAlertCount: delta.deltaAlertIds.length,
      generationUuid: delta.generationUuid,
      discoveriesGenerated: adResult?.attackDiscoveries?.length ?? 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`triggerCaseAttackDiscovery: failed for case ${caseId}: ${errorMessage}`);

    return {
      caseId,
      triggered: false,
      skipReason: `AD generation failed: ${errorMessage}`,
      deltaAlertCount: delta.deltaAlertIds.length,
      generationUuid: delta.generationUuid,
      discoveriesGenerated: 0,
    };
  }
};
