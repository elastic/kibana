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
  IUiSettingsClient,
} from '@kbn/core/server';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { AttachmentType, ConnectorTypes } from '@kbn/cases-plugin/common';
import { v4 as uuidv4 } from 'uuid';

import type { PipelineConfig, PipelineExecutionResult, ExtractedEntity } from './types';
import { DEFAULT_PIPELINE_CONFIG } from './types';
import { deduplicateAlerts } from './deduplication';
import { extractEntitiesFromAlerts } from './entity_extraction';
import { matchAlertsToCases } from './case_matching';
import { triggerCaseAttackDiscovery } from './case_integration';
import type { EnrichmentRegistry } from './enrichment';
import { ALERT_INVESTIGATION_PIPELINE_ENABLED } from '../../../common/ui_settings';

type GenerateAdFn = (params: {
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

export interface RunPipelineParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  cases: CasesServerStart;
  config?: Partial<PipelineConfig>;
  enrichmentRegistry?: EnrichmentRegistry;
  esClient: ElasticsearchClient;
  logger: Logger;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  spaceId: string;
  uiSettings?: IUiSettingsClient; // Optional for backward compatibility
  dryRun?: boolean;
  generateAttackDiscoveriesFn: GenerateAdFn;
}

interface CaseMatchingContext {
  entities: ExtractedEntity[];
  cases: CasesServerStart;
  config: PipelineConfig;
  logger: Logger;
  request: KibanaRequest;
  spaceId: string;
  errors: string[];
}

interface CaseMatchingOutput {
  casesMatched: number;
  casesCreated: number;
  alertsAttached: number;
  affectedCaseIds: Set<string>;
}

const runCaseMatchingAndAttachment = async (
  ctx: CaseMatchingContext
): Promise<CaseMatchingOutput> => {
  let casesMatched = 0;
  let casesCreated = 0;
  let alertsAttached = 0;
  const affectedCaseIds = new Set<string>();

  const matchResult = await matchAlertsToCases({
    entities: ctx.entities,
    cases: ctx.cases,
    config: ctx.config.caseMatching,
    logger: ctx.logger,
    request: ctx.request,
  });

  casesMatched = matchResult.stats.alertsMatched;
  const casesClient = await ctx.cases.getCasesClientWithRequest(ctx.request);
  const alertsByCaseId = new Map<string, string[]>();

  for (const match of matchResult.matched) {
    if (match.matchedCase) {
      const existing = alertsByCaseId.get(match.matchedCase.caseId) ?? [];
      existing.push(match.alertId);
      alertsByCaseId.set(match.matchedCase.caseId, existing);
    }
  }

  const MAX_ATTACHMENTS_PER_CASE = 100;

  for (const [caseId, alertIds] of alertsByCaseId) {
    try {
      const capped = alertIds.slice(0, MAX_ATTACHMENTS_PER_CASE);
      if (capped.length < alertIds.length) {
        ctx.logger.warn(
          `Capping alert attachments for case ${caseId}: ${capped.length}/${alertIds.length}`
        );
      }

      // Batch promises in chunks of 10 to avoid overwhelming the client
      for (let i = 0; i < capped.length; i += 10) {
        const chunk = capped.slice(i, i + 10);
        await Promise.all(
          chunk.map((alertId) =>
            casesClient.attachments.add({
              caseId,
              comment: {
                type: AttachmentType.alert,
                alertId,
                index:
                  ctx.spaceId === 'default'
                    ? '.alerts-security.alerts-default'
                    : `.alerts-security.alerts-${ctx.spaceId}`,
                rule: { id: null, name: null },
                owner: 'securitySolution',
              },
            })
          )
        );
        alertsAttached += chunk.length;
      }

      affectedCaseIds.add(caseId);
    } catch (error) {
      ctx.errors.push(
        `Failed to attach alerts to case ${caseId}: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  if (matchResult.unmatched.length > 0) {
    const createResult = await createCaseForUnmatched({
      casesClient,
      unmatched: matchResult.unmatched,
      spaceId: ctx.spaceId,
      logger: ctx.logger,
      errors: ctx.errors,
    });
    casesCreated += createResult.casesCreated;
    alertsAttached += createResult.alertsAttached;
    for (const id of createResult.caseIds) {
      affectedCaseIds.add(id);
    }
    for (const [caseId, ids] of createResult.alertIdsByCaseId) {
      const existing = alertsByCaseId.get(caseId) ?? [];
      alertsByCaseId.set(caseId, [...existing, ...ids]);
    }
  }

  await addObservablesToCases({
    casesClient,
    entities: ctx.entities,
    alertsByCaseId,
    affectedCaseIds,
    logger: ctx.logger,
  });

  return { casesMatched, casesCreated, alertsAttached, affectedCaseIds };
};

const createCaseForUnmatched = async ({
  casesClient,
  unmatched,
  spaceId,
  logger: _logger,
  errors,
}: {
  casesClient: Awaited<ReturnType<CasesServerStart['getCasesClientWithRequest']>>;
  unmatched: Array<{ alertId: string }>;
  spaceId: string;
  logger: Logger;
  errors: string[];
}): Promise<{
  casesCreated: number;
  alertsAttached: number;
  caseIds: string[];
  alertIdsByCaseId: Map<string, string[]>;
}> => {
  let casesCreated = 0;
  let alertsAttached = 0;
  const caseIds: string[] = [];
  const alertIdsByCaseId = new Map<string, string[]>();

  try {
    const newCase = await casesClient.cases.create({
      title: `Auto-grouped Investigation - ${new Date().toISOString().split('T')[0]}`,
      description: `Automatically created by the alert investigation pipeline.\n\n${unmatched.length} alerts did not match any existing case.`,
      tags: ['auto-grouped', 'pipeline-created'],
      owner: 'securitySolution',
      connector: { id: 'none', name: 'none', type: ConnectorTypes.none, fields: null },
      settings: { syncAlerts: true },
    });

    casesCreated++;
    caseIds.push(newCase.id);
    const attachedAlertIds: string[] = [];

    for (let i = 0; i < unmatched.length; i += 10) {
      const chunk = unmatched.slice(i, i + 10);
      try {
        await Promise.all(
          chunk.map((unmatchedResult) =>
            casesClient.attachments.add({
              caseId: newCase.id,
              comment: {
                type: AttachmentType.alert,
                alertId: unmatchedResult.alertId,
                index:
                  spaceId === 'default'
                    ? '.alerts-security.alerts-default'
                    : `.alerts-security.alerts-${spaceId}`,
                rule: { id: null, name: null },
                owner: 'securitySolution',
              },
            })
          )
        );
        alertsAttached += chunk.length;
        attachedAlertIds.push(...chunk.map((u) => u.alertId));
      } catch (error) {
        errors.push(`Failed to attach some alerts in chunk to new case: ${error}`);
      }
    }

    alertIdsByCaseId.set(newCase.id, attachedAlertIds);
  } catch (error) {
    errors.push(
      `Failed to create new case for unmatched alerts: ${
        error instanceof Error ? error.message : error
      }`
    );
  }

  return { casesCreated, alertsAttached, caseIds, alertIdsByCaseId };
};

const PIPELINE_TO_CASES_TYPE_KEY: Record<string, string> = {
  ipv4: 'observable-type-ipv4',
  ipv6: 'observable-type-ipv6',
  url: 'observable-type-url',
  hostname: 'observable-type-hostname',
  file_hash: 'observable-type-file-hash',
  file_path: 'observable-type-file-path',
  email: 'observable-type-email',
  domain: 'observable-type-domain',
  agent_id: 'observable-type-agent-id',
  user: 'observable-type-user',
  process: 'observable-type-process',
  registry: 'observable-type-registry',
  service: 'observable-type-service',
};

const toCasesTypeKey = (pipelineKey: string): string =>
  PIPELINE_TO_CASES_TYPE_KEY[pipelineKey] ?? pipelineKey;

const addObservablesToCases = async ({
  casesClient,
  entities,
  alertsByCaseId,
  affectedCaseIds,
  logger,
}: {
  casesClient: Awaited<ReturnType<CasesServerStart['getCasesClientWithRequest']>>;
  entities: ExtractedEntity[];
  alertsByCaseId: Map<string, string[]>;
  affectedCaseIds: Set<string>;
  logger: Logger;
}): Promise<void> => {
  for (const caseId of affectedCaseIds) {
    try {
      const caseAlertIds = alertsByCaseId.get(caseId) ?? [];
      const caseEntities = entities.filter((e) => caseAlertIds.includes(e.alertId));

      if (caseEntities.length > 0) {
        const seen = new Set<string>();
        const observables = caseEntities
          .reduce<Array<{ typeKey: string; value: string; description: string }>>((acc, e) => {
            const dedupeKey = `${toCasesTypeKey(e.typeKey)}::${e.value.toLowerCase()}`;
            if (!seen.has(dedupeKey)) {
              seen.add(dedupeKey);
              acc.push({
                typeKey: toCasesTypeKey(e.typeKey),
                value: e.value,
                description: `Auto-extracted from alert via pipeline (field: ${e.sourceField})`,
              });
            }
            return acc;
          }, [])
          .slice(0, 50);

        await casesClient.cases.bulkAddObservables({ caseId, observables });
      }
    } catch (error) {
      logger.warn(`Failed to add observables to case ${caseId}: ${error}`);
    }
  }
};

const runIncrementalAdForCases = async ({
  actionsClient,
  affectedCaseIds,
  cases,
  config,
  esClient,
  generateAttackDiscoveriesFn,
  logger,
  request,
  savedObjectsClient,
  spaceId,
  errors,
}: {
  actionsClient: PublicMethodsOf<ActionsClient>;
  affectedCaseIds: Set<string>;
  cases: CasesServerStart;
  config: PipelineConfig;
  esClient: ElasticsearchClient;
  generateAttackDiscoveriesFn: GenerateAdFn;
  logger: Logger;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  spaceId: string;
  errors: string[];
}): Promise<number> => {
  let adTriggered = 0;

  for (const caseId of affectedCaseIds) {
    try {
      const adResult = await triggerCaseAttackDiscovery({
        actionsClient,
        caseId,
        cases,
        config: config.incrementalAd,
        esClient,
        generateAttackDiscoveriesFn,
        logger,
        request,
        savedObjectsClient,
        spaceId,
      });

      if (adResult.triggered) {
        adTriggered++;
      }
    } catch (error) {
      errors.push(
        `Incremental AD failed for case ${caseId}: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  return adTriggered;
};

export const runInvestigationPipeline = async ({
  actionsClient,
  cases,
  config: configOverrides,
  enrichmentRegistry,
  esClient,
  generateAttackDiscoveriesFn,
  logger,
  request,
  savedObjectsClient,
  spaceId,
  uiSettings,
  dryRun = false,
}: RunPipelineParams): Promise<PipelineExecutionResult> => {
  const executionId = uuidv4();
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  const config: PipelineConfig = {
    ...DEFAULT_PIPELINE_CONFIG,
    ...configOverrides,
    deduplication: { ...DEFAULT_PIPELINE_CONFIG.deduplication, ...configOverrides?.deduplication },
    entityExtraction: {
      ...DEFAULT_PIPELINE_CONFIG.entityExtraction,
      ...configOverrides?.entityExtraction,
    },
    caseMatching: {
      ...DEFAULT_PIPELINE_CONFIG.caseMatching,
      ...configOverrides?.caseMatching,
      weights: {
        ...DEFAULT_PIPELINE_CONFIG.caseMatching.weights,
        ...configOverrides?.caseMatching?.weights,
      },
    },
    incrementalAd: { ...DEFAULT_PIPELINE_CONFIG.incrementalAd, ...configOverrides?.incrementalAd },
  };

  // Check feature flag (skip pipeline if disabled, unless dry run for testing)
  if (!dryRun && uiSettings) {
    const isPipelineEnabled = await uiSettings.get<boolean>(ALERT_INVESTIGATION_PIPELINE_ENABLED);

    if (!isPipelineEnabled) {
      logger.info(
        `Pipeline ${executionId}: disabled via feature flag (${ALERT_INVESTIGATION_PIPELINE_ENABLED})`
      );

      const completedAt = new Date().toISOString();
      return {
        executionId,
        startedAt,
        completedAt,
        alertsProcessed: 0,
        alertsDeduplicated: 0,
        entitiesExtracted: 0,
        entitiesEnriched: 0,
        enrichmentStats: {},
        casesMatched: 0,
        casesCreated: 0,
        alertsAttached: 0,
        adTriggered: 0,
        errors: [
          `Pipeline disabled. Enable via Advanced Settings → ${ALERT_INVESTIGATION_PIPELINE_ENABLED}`,
        ],
      };
    }
  } else if (!uiSettings && !dryRun) {
    logger.warn(
      `Pipeline ${executionId}: uiSettings not provided - cannot check feature flag. Pipeline will run.`
    );
  }

  logger.info(`Pipeline ${executionId}: starting${dryRun ? ' (dry run)' : ''}`);

  const alertsResult = await fetchUnprocessedAlerts({
    esClient,
    spaceId,
    lookbackMinutes: config.intervalMinutes,
    maxAlerts: 500,
  });

  if (alertsResult.alerts.length === 0) {
    logger.info(`Pipeline ${executionId}: no unprocessed alerts found`);
    return buildResult({ executionId, startedAt, errors });
  }

  let leadersForProcessing = alertsResult.alerts;
  let alertsDeduplicated = 0;

  if (config.deduplication.enabled) {
    const dedupResult = await deduplicateAlerts({
      alerts: alertsResult.alerts,
      esClient,
      logger,
      similarityThreshold: config.deduplication.similarityThreshold,
    });
    leadersForProcessing = dedupResult.leaders;
    alertsDeduplicated = dedupResult.stats.duplicatesRemoved;
  }

  let entities: ExtractedEntity[] = [];
  if (config.entityExtraction.enabled) {
    const extractionResult = extractEntitiesFromAlerts({
      alerts: leadersForProcessing,
      config: config.entityExtraction,
      logger,
    });
    entities = extractionResult.entities;
  }

  let entitiesEnriched = 0;
  const enrichmentStats: Record<string, number> = {};
  if (enrichmentRegistry && entities.length > 0) {
    try {
      const enrichResult = await enrichmentRegistry.runAll({
        entities,
        config,
        logger,
      });
      entities = enrichResult.enrichedEntities;
      entitiesEnriched = enrichResult.stats.totalEnriched;
      Object.assign(enrichmentStats, enrichResult.stats.bySource);
      logger.info(
        `Pipeline ${executionId}: enriched ${entitiesEnriched} entities from ${
          Object.keys(enrichmentStats).length
        } source(s)`
      );
    } catch (error) {
      errors.push(`Enrichment failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  if (dryRun) {
    return buildResult({
      executionId,
      startedAt,
      alertsProcessed: alertsResult.alerts.length,
      alertsDeduplicated,
      entitiesExtracted: entities.length,
      entitiesEnriched,
      enrichmentStats,
      errors,
    });
  }

  let casesMatched = 0;
  let casesCreated = 0;
  let alertsAttached = 0;
  let adTriggered = 0;
  let affectedCaseIds = new Set<string>();

  if (config.caseMatching.enabled && entities.length > 0) {
    try {
      const matchOutput = await runCaseMatchingAndAttachment({
        entities,
        cases,
        config,
        logger,
        request,
        spaceId,
        errors,
      });
      casesMatched = matchOutput.casesMatched;
      casesCreated = matchOutput.casesCreated;
      alertsAttached = matchOutput.alertsAttached;
      affectedCaseIds = matchOutput.affectedCaseIds;
    } catch (error) {
      errors.push(`Case matching failed: ${error instanceof Error ? error.message : error}`);
    }
  } else if (
    config.caseMatching.enabled &&
    entities.length === 0 &&
    leadersForProcessing.length > 0
  ) {
    logger.warn(
      `Pipeline ${executionId}: ${leadersForProcessing.length} leader alerts produced 0 entities — these alerts will be tagged as processed but not matched to any case`
    );
  }

  if (config.incrementalAd.enabled && affectedCaseIds.size > 0) {
    adTriggered = await runIncrementalAdForCases({
      actionsClient,
      affectedCaseIds,
      cases,
      config,
      esClient,
      generateAttackDiscoveriesFn,
      logger,
      request,
      savedObjectsClient,
      spaceId,
      errors,
    });
  }

  try {
    await tagAlertsAsProcessed({
      esClient,
      alertIds: alertsResult.alerts.map((a) => a._id),
      spaceId,
      logger,
    });
  } catch (error) {
    errors.push(`Failed to tag alerts as processed: ${error}`);
  }

  return buildResult({
    executionId,
    startedAt,
    alertsProcessed: alertsResult.alerts.length,
    alertsDeduplicated,
    entitiesExtracted: entities.length,
    entitiesEnriched,
    enrichmentStats,
    casesMatched,
    casesCreated,
    alertsAttached,
    adTriggered,
    errors,
  });
};

const fetchUnprocessedAlerts = async ({
  esClient,
  spaceId,
  lookbackMinutes,
  maxAlerts,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  lookbackMinutes: number;
  maxAlerts: number;
}): Promise<{ alerts: Array<{ _id: string; _source: Record<string, unknown> }> }> => {
  const now = new Date();
  const lookbackTime = new Date(now.getTime() - lookbackMinutes * 60 * 1000);
  const index =
    spaceId === 'default'
      ? '.alerts-security.alerts-default'
      : `.alerts-security.alerts-${spaceId}`;

  const result = await esClient.search({
    index,
    query: {
      bool: {
        filter: [
          { terms: { 'kibana.alert.workflow_status': ['open', 'acknowledged'] } },
          { range: { '@timestamp': { gte: lookbackTime.toISOString() } } },
          {
            bool: {
              must_not: [
                { exists: { field: 'kibana.alert.building_block_type' } },
                { exists: { field: 'kibana.alert.pipeline.processed' } },
              ],
            },
          },
        ],
      },
    },
    sort: [{ 'kibana.alert.risk_score': { order: 'desc' as const } }],
    size: maxAlerts,
  });

  return {
    alerts: result.hits.hits
      .filter((hit): hit is typeof hit & { _id: string } => hit._id != null)
      .map((hit) => ({
        _id: hit._id,
        _source: (hit._source ?? {}) as Record<string, unknown>,
      })),
  };
};

const tagAlertsAsProcessed = async ({
  esClient,
  alertIds,
  spaceId,
  logger,
}: {
  esClient: ElasticsearchClient;
  alertIds: string[];
  spaceId: string;
  logger: Logger;
}): Promise<void> => {
  if (alertIds.length === 0) return;

  const index =
    spaceId === 'default'
      ? '.alerts-security.alerts-default'
      : `.alerts-security.alerts-${spaceId}`;
  const operations = alertIds.flatMap((id) => [
    { update: { _id: id, _index: index } },
    {
      doc: {
        kibana: {
          alert: { pipeline: { processed: true, processed_at: new Date().toISOString() } },
        },
      },
    },
  ]);

  const result = await esClient.bulk({ operations, refresh: 'wait_for' });
  if (result.errors) {
    const failedCount = result.items.filter((item) => item.update?.error).length;
    logger.warn(`Failed to tag ${failedCount}/${alertIds.length} alerts as processed`);
  }
};

const buildResult = ({
  executionId,
  startedAt,
  alertsProcessed = 0,
  alertsDeduplicated = 0,
  entitiesExtracted = 0,
  entitiesEnriched = 0,
  enrichmentStats = {},
  casesMatched = 0,
  casesCreated = 0,
  alertsAttached = 0,
  adTriggered = 0,
  errors = [],
}: {
  executionId: string;
  startedAt: string;
  alertsProcessed?: number;
  alertsDeduplicated?: number;
  entitiesExtracted?: number;
  entitiesEnriched?: number;
  enrichmentStats?: Record<string, number>;
  casesMatched?: number;
  casesCreated?: number;
  alertsAttached?: number;
  adTriggered?: number;
  errors?: string[];
}): PipelineExecutionResult => ({
  executionId,
  startedAt,
  completedAt: new Date().toISOString(),
  alertsProcessed,
  alertsDeduplicated,
  entitiesExtracted,
  entitiesEnriched,
  enrichmentStats,
  casesMatched,
  casesCreated,
  alertsAttached,
  adTriggered,
  errors,
});
