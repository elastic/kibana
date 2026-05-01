/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';
import { v4 as uuidv4 } from 'uuid';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import type {
  EntityAnalyticsConfig,
  EntityAnalyticsRoutesDeps,
  RiskEngineConfiguration,
} from '../../types';
import { DEFAULT_RISK_SCORE_PAGE_SIZE } from '../../../../../common/constants';
import {
  getEntityAnalyticsEntityTypes,
  getAlertsIndex,
} from '../../../../../common/entity_analytics/utils';
import type { ProductFeaturesService } from '../../../product_features_service/product_features_service';
import { RiskScoreDataClient } from '../risk_score_data_client';
import {
  initSavedObjects,
  getConfiguration,
  getDefaultRiskEngineConfiguration,
} from '../../risk_engine/utils/saved_object_configuration';
import {
  buildScopedInternalSavedObjectsClientUnsafe,
  buildInternalSavedObjectsClientUnsafe,
} from '../tasks/helpers';
import { getIsIdBasedRiskScoringEnabled } from '../is_id_based_risk_scoring_enabled';
import { getIndexPatternDataStream } from '../configurations';
import { resetToZero } from './steps/reset_to_zero';
import { buildAlertFilters } from './steps/build_alert_filters';
import { scoreBaseEntities } from './steps/score_base_entities';
import type { MaintainerErrorKind } from './telemetry_reporter';
import { createRiskScoreMaintainerTelemetryReporter } from './telemetry_reporter';
import { fetchWatchlistConfigs } from './utils/fetch_watchlist_configs';
import { withLogContext } from './utils/with_log_context';
import { ensureLookupIndex } from './lookup/lookup_index';
import { pruneLookupIndex } from './lookup/prune_lookup_index';
import { runResolutionScoringStep } from './steps/run_resolution_scoring_step';
import { createRunMetricsTracker } from './utils/run_metrics_tracker';

export interface RiskScoreMaintainerDeps {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  entityAnalyticsConfig: EntityAnalyticsConfig;
  kibanaVersion: string;
  logger: Logger;
  auditLogger: AuditLogger | undefined;
  productFeaturesService: ProductFeaturesService;
  telemetry: AnalyticsServiceSetup;
}

type RiskScoreMaintainerConfig = Pick<RegisterEntityMaintainerConfig, 'setup' | 'run'>;
type StartServices = Awaited<ReturnType<RiskScoreMaintainerDeps['getStartServices']>>;
type CoreStart = StartServices[0];
type PluginsStart = StartServices[1];
type RunMetricsTracker = ReturnType<typeof createRunMetricsTracker>;
type TelemetryReporter = ReturnType<typeof createRiskScoreMaintainerTelemetryReporter>;
const toRunTag = (calculationRunId: string) => calculationRunId.slice(0, 8);

interface InitializedRunContext {
  namespace: string;
  coreStart: CoreStart;
  pluginsStart: PluginsStart;
  esClient: CoreStart['elasticsearch']['client']['asInternalUser'];
  soClient: ReturnType<typeof buildScopedInternalSavedObjectsClientUnsafe>;
  internalSoClient: ReturnType<typeof buildInternalSavedObjectsClientUnsafe>;
  riskScoreDataClient: RiskScoreDataClient;
  lookupIndex: string;
}

interface LoadedRunConfig {
  configuration: RiskEngineConfiguration;
  alertsIndex: string;
  idBasedRiskScoringEnabled: boolean;
  watchlistConfigs: Awaited<ReturnType<typeof fetchWatchlistConfigs>>;
  writer: Awaited<ReturnType<RiskScoreDataClient['getWriter']>>;
  sampleSize: number;
  pageSize: number;
  entityTypes: EntityType[];
}

export const createRiskScoreMaintainer = ({
  getStartServices,
  entityAnalyticsConfig,
  kibanaVersion,
  logger,
  auditLogger,
  productFeaturesService,
  telemetry,
}: RiskScoreMaintainerDeps): RiskScoreMaintainerConfig => {
  const telemetryReporter = createRiskScoreMaintainerTelemetryReporter({
    telemetry,
  });

  return {
    setup: async ({ status }) => {
      const namespace = status.metadata.namespace;
      const [coreStart] = await getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const soClient = buildScopedInternalSavedObjectsClientUnsafe({ coreStart, namespace });

      const riskScoreDataClient = new RiskScoreDataClient({
        logger,
        kibanaVersion,
        esClient,
        namespace,
        soClient,
        auditLogger,
      });

      logger.debug(`Ensuring risk score resources exist for namespace "${namespace}"`);
      await initSavedObjects({ savedObjectsClient: soClient, logger, namespace });
      await riskScoreDataClient.init();
      await ensureLookupIndex({ esClient, namespace });
      logger.info(`Risk score maintainer setup completed for namespace "${namespace}"`);
      return status.state;
    },
    run: async ({ status, crudClient, abortController }) => {
      const runContext = await initializeRunContext({
        getStartServices,
        namespace: status.metadata.namespace,
        logger,
        kibanaVersion,
        auditLogger,
      });
      const canRun = await checkRunPrerequisites({
        telemetryReporter,
        productFeaturesService,
        pluginsStart: runContext.pluginsStart,
        namespace: runContext.namespace,
        logger,
      });
      if (!canRun) {
        return status.state;
      }

      const runConfig = await loadRunConfiguration({
        coreStart: runContext.coreStart,
        soClient: runContext.soClient,
        internalSoClient: runContext.internalSoClient,
        esClient: runContext.esClient,
        riskScoreDataClient: runContext.riskScoreDataClient,
        namespace: runContext.namespace,
        logger,
        entityAnalyticsConfig,
      });

      const maintainerRunStartedAtMs = Date.now();
      const metricsTracker = createRunMetricsTracker();
      telemetryReporter.clearGlobalSkipReason();
      for (const entityType of runConfig.entityTypes) {
        if (abortController.signal.aborted) {
          logger.info('Risk score maintainer run aborted before processing entity type');
          break;
        }
        await executeEntityTypeRun({
          entityType,
          crudClient,
          logger,
          abortSignal: abortController.signal,
          telemetryReporter,
          metricsTracker,
          runContext,
          runConfig,
        });
      }

      const maintainerRunDurationMs = Date.now() - maintainerRunStartedAtMs;
      logger.info(
        `Risk score maintainer run completed for namespace "${runContext.namespace}" in ${maintainerRunDurationMs}ms`
      );
      const maintainerTotals = metricsTracker.toAggregateSummary({
        namespace: runContext.namespace,
        durationMs: maintainerRunDurationMs,
        entityTypesProcessed: runConfig.entityTypes.length,
        idBasedRiskScoringEnabled: runConfig.idBasedRiskScoringEnabled,
      });
      logger.info(`maintainer totals ${JSON.stringify(maintainerTotals)}`);
      return status.state;
    },
  };
};

const initializeRunContext = async ({
  getStartServices,
  namespace,
  logger,
  kibanaVersion,
  auditLogger,
}: {
  getStartServices: RiskScoreMaintainerDeps['getStartServices'];
  namespace: string;
  logger: Logger;
  kibanaVersion: string;
  auditLogger: AuditLogger | undefined;
}): Promise<InitializedRunContext> => {
  const [coreStart, pluginsStart] = await getStartServices();
  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const soClient = buildScopedInternalSavedObjectsClientUnsafe({ coreStart, namespace });
  const internalSoClient = buildInternalSavedObjectsClientUnsafe({ coreStart });
  const riskScoreDataClient = new RiskScoreDataClient({
    logger,
    kibanaVersion,
    esClient,
    namespace,
    soClient,
    auditLogger,
  });

  logger.debug(`Ensuring risk score resources exist for namespace "${namespace}"`);
  await initSavedObjects({ savedObjectsClient: soClient, logger, namespace });
  await riskScoreDataClient.init();
  const lookupIndex = await ensureLookupIndex({ esClient, namespace });

  return {
    namespace,
    coreStart,
    pluginsStart,
    esClient,
    soClient,
    internalSoClient,
    riskScoreDataClient,
    lookupIndex,
  };
};

const checkRunPrerequisites = async ({
  telemetryReporter,
  productFeaturesService,
  pluginsStart,
  namespace,
  logger,
}: {
  telemetryReporter: TelemetryReporter;
  productFeaturesService: ProductFeaturesService;
  pluginsStart: PluginsStart;
  namespace: string;
  logger: Logger;
}): Promise<boolean> => {
  const license = await pluginsStart.licensing.getLicense();
  // Keep both checks so gating works in ESS (license) and Serverless (feature flag).
  const isFeatureEnabled = productFeaturesService.isEnabled(ProductFeatureKey.advancedInsights);
  const hasPlatinumLicense = license.hasAtLeast('platinum');
  if (isFeatureEnabled && hasPlatinumLicense) {
    return true;
  }

  const skipReason = !isFeatureEnabled ? 'feature_disabled' : 'license_insufficient';
  telemetryReporter.reportGlobalSkipIfChanged({
    namespace,
    skipReason,
    idBasedRiskScoringEnabled: false,
  });
  logger.debug('Risk score maintainer run skipped due to insufficient license or feature disabled');
  return false;
};

const loadRunConfiguration = async ({
  coreStart,
  soClient,
  internalSoClient,
  esClient,
  riskScoreDataClient,
  namespace,
  logger,
  entityAnalyticsConfig,
}: {
  coreStart: CoreStart;
  soClient: ReturnType<typeof buildScopedInternalSavedObjectsClientUnsafe>;
  internalSoClient: ReturnType<typeof buildInternalSavedObjectsClientUnsafe>;
  esClient: CoreStart['elasticsearch']['client']['asInternalUser'];
  riskScoreDataClient: RiskScoreDataClient;
  namespace: string;
  logger: Logger;
  entityAnalyticsConfig: EntityAnalyticsConfig;
}): Promise<LoadedRunConfig> => {
  const configuration: RiskEngineConfiguration =
    (await getConfiguration({ savedObjectsClient: soClient, logger, namespace })) ??
    getDefaultRiskEngineConfiguration({ namespace });
  const dataViewId = configuration.dataViewId ?? getAlertsIndex(namespace);
  const { index: alertsIndex } = await riskScoreDataClient.getRiskInputsIndex({ dataViewId });
  const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);
  const idBasedRiskScoringEnabled = await getIsIdBasedRiskScoringEnabled(uiSettingsClient);
  const watchlistConfigs = await fetchWatchlistConfigs({
    soClient: internalSoClient,
    esClient,
    namespace,
    logger,
  });
  const writer = await riskScoreDataClient.getWriter({ namespace });
  const sampleSize =
    configuration.alertSampleSizePerShard ??
    entityAnalyticsConfig?.riskEngine?.alertSampleSizePerShard ??
    10000;
  const pageSize = configuration.pageSize ?? DEFAULT_RISK_SCORE_PAGE_SIZE;
  const entityTypes = configuration.identifierType
    ? [configuration.identifierType]
    : getEntityAnalyticsEntityTypes();

  return {
    configuration,
    alertsIndex,
    idBasedRiskScoringEnabled,
    watchlistConfigs,
    writer,
    sampleSize,
    pageSize,
    entityTypes,
  };
};

const executeEntityTypeRun = async ({
  entityType,
  crudClient,
  logger,
  abortSignal,
  telemetryReporter,
  metricsTracker,
  runContext,
  runConfig,
}: {
  entityType: EntityType;
  crudClient: Parameters<NonNullable<RiskScoreMaintainerConfig['run']>>[0]['crudClient'];
  logger: Logger;
  abortSignal?: AbortSignal;
  telemetryReporter: TelemetryReporter;
  metricsTracker: RunMetricsTracker;
  runContext: InitializedRunContext;
  runConfig: LoadedRunConfig;
}) => {
  const entityRunStartedAtMs = Date.now();
  const calculationRunId = uuidv4();
  const runNow = new Date().toISOString();
  const runTag = toRunTag(calculationRunId);
  const runLogger = withLogContext(logger, `[risk_score_maintainer][${entityType}][run:${runTag}]`);
  let runStatus: 'success' | 'error' | 'aborted' = 'success';
  let runErrorKind: MaintainerErrorKind | undefined;
  const runMetrics = metricsTracker.newRun();
  const runTelemetry = telemetryReporter.forRun({
    namespace: runContext.namespace,
    entityType,
    idBasedRiskScoringEnabled: runConfig.idBasedRiskScoringEnabled,
  });
  let skipRemainingStages = false;
  const checkAbortBetweenStages = () => {
    if (abortSignal?.aborted) {
      runLogger.info('Risk score maintainer run aborted between stages');
      if (runStatus === 'success') {
        runStatus = 'aborted';
      }
      skipRemainingStages = true;
    }
  };

  const alertsIndexExists = await runContext.esClient.indices.exists({
    index: runConfig.alertsIndex,
  });
  if (!alertsIndexExists) {
    runLogger.warn(
      `Skipping risk scoring run: alerts index "${runConfig.alertsIndex}" does not exist yet.`
    );
    return;
  }

  runLogger.debug('starting base scoring/reset pass');
  // Stage 1: score base entity risk and update lookup docs.
  const alertFilters = buildAlertFilters(runConfig.configuration, entityType, runLogger);
  const baseStage = runTelemetry.startBaseStage();
  const lookupStage = runTelemetry.startLookupSyncStage();

  try {
    const baseSummary = await scoreBaseEntities({
      alertFilters,
      alertsIndex: runConfig.alertsIndex,
      crudClient,
      entityType,
      esClient: runContext.esClient,
      lookupIndex: runContext.lookupIndex,
      logger: runLogger,
      now: runNow,
      calculationRunId,
      pageSize: runConfig.pageSize,
      sampleSize: runConfig.sampleSize,
      watchlistConfigs: runConfig.watchlistConfigs,
      abortSignal,
      idBasedRiskScoringEnabled: runConfig.idBasedRiskScoringEnabled,
      writer: runConfig.writer,
    });
    runLogger.debug('completed base scoring pass');
    metricsTracker.recordBase(runMetrics, baseSummary);
    baseStage.success({
      pagesProcessed: baseSummary.pagesProcessed,
      scoresWritten: baseSummary.scoresWritten,
      deferToPhase2Count: baseSummary.deferToPhase2Count,
      notInStoreCount: baseSummary.notInStoreCount,
    });
    lookupStage.success({
      lookupDocsUpserted: baseSummary.lookupDocsUpserted,
      lookupDocsDeleted: baseSummary.lookupDocsDeleted,
    });
  } catch (error) {
    const errorMessage = telemetryReporter.getErrorMessage(error);
    runStatus = 'error';
    runErrorKind = 'unexpected';
    runLogger.error(`base scoring failed: ${errorMessage}`);
    baseStage.error({ errorKind: 'unexpected' });
    lookupStage.error({ errorKind: 'unexpected' });
    runTelemetry.errorSummary({ errorKind: 'unexpected' });
    throw error;
  }

  checkAbortBetweenStages();

  if (!skipRemainingStages) {
    if (runMetrics.lookupDocsUpserted > 0) {
      // Refresh so stage 2 can read the latest lookup docs.
      await runContext.esClient.indices.refresh({ index: runContext.lookupIndex });
      runLogger.debug(`refreshed lookup index after ${runMetrics.lookupDocsUpserted} upserts`);
    }

    // Stage 2: score resolution targets (group scores).
    const resolutionStage = runTelemetry.startResolutionStage();
    try {
      const resolutionResult = await runResolutionScoringStep({
        esClient: runContext.esClient,
        crudClient,
        logger: runLogger,
        entityType,
        alertsIndex: runConfig.alertsIndex,
        lookupIndex: runContext.lookupIndex,
        pageSize: runConfig.pageSize,
        sampleSize: runConfig.sampleSize,
        now: runNow,
        calculationRunId,
        watchlistConfigs: runConfig.watchlistConfigs,
        abortSignal,
        idBasedRiskScoringEnabled: runConfig.idBasedRiskScoringEnabled,
        writer: runConfig.writer,
      });
      metricsTracker.recordResolution(runMetrics, resolutionResult);
      if (resolutionResult.skippedReason) {
        resolutionStage.skipped(resolutionResult.skippedReason);
      } else {
        resolutionStage.success({
          pagesProcessed: resolutionResult.pagesProcessed,
          scoresWritten: resolutionResult.scoresWritten,
        });
      }
    } catch (error) {
      const errorMessage = telemetryReporter.getErrorMessage(error);
      runStatus = 'error';
      runErrorKind = 'unexpected';
      runLogger.error(`resolution scoring failed: ${errorMessage}`);
      resolutionStage.error({ errorKind: 'unexpected' });
    }
  }

  checkAbortBetweenStages();

  if (!skipRemainingStages) {
    // Refresh the risk score data stream so reset-to-zero can see scores written in phases 1 & 2.
    // Without this, the ES|QL query in reset may not see the new documents and could incorrectly
    // zero out scores that were just written in this run.
    const { alias: riskScoreAlias } = getIndexPatternDataStream(runContext.namespace);
    await runContext.esClient.indices.refresh({ index: riskScoreAlias });

    // Stage 3: reset stale positive scores not touched in this run.
    if (runConfig.configuration.enableResetToZero !== false) {
      const resetStage = runTelemetry.startResetStage();
      try {
        const resetResult = await resetToZero({
          esClient: runContext.esClient,
          writer: runConfig.writer,
          spaceId: runContext.namespace,
          entityType,
          logger: runLogger,
          idBasedRiskScoringEnabled: runConfig.idBasedRiskScoringEnabled,
          crudClient,
          watchlistConfigs: runConfig.watchlistConfigs,
          calculationRunId,
          now: runNow,
        });
        metricsTracker.recordResetToZero(runMetrics, resetResult);
        if (resetResult.scoresWritten > 0) {
          runLogger.info(`reset ${resetResult.scoresWritten} stale risk scores to zero`);
        } else {
          runLogger.debug('reset_to_zero found no stale scores');
        }
        resetStage.success({
          scoresWritten: resetResult.scoresWritten,
          resetBatchLimitHit: resetResult.resetBatchLimitHit,
        });
      } catch (error) {
        const errorMessage = telemetryReporter.getErrorMessage(error);
        runStatus = 'error';
        runErrorKind = 'unexpected';
        resetStage.error({ errorKind: 'unexpected' });
        runLogger.error(`error resetting risk scores to zero: ${errorMessage}`);
      }
    } else {
      runLogger.debug('reset_to_zero disabled in configuration');
      runTelemetry.startResetStage().skipped();
    }
  }

  checkAbortBetweenStages();

  if (!skipRemainingStages) {
    // Final cleanup: remove old lookup docs outside the current risk window.
    const riskWindowStart = runConfig.configuration.range?.start ?? 'now-30d';
    try {
      const prunedDocs = await pruneLookupIndex({
        esClient: runContext.esClient,
        index: runContext.lookupIndex,
        riskWindowStart,
      });
      metricsTracker.recordPrune(runMetrics, prunedDocs);
      if (prunedDocs > 0) {
        runLogger.debug(`pruned ${prunedDocs} stale lookup documents`);
      }
    } catch (error) {
      runStatus = 'error';
      runErrorKind = 'unexpected';
      runLogger.error(`error pruning lookup index: ${telemetryReporter.getErrorMessage(error)}`);
    }
  }

  runTelemetry.completionSummary({
    runStatus,
    runErrorKind,
    ...runMetrics,
  });
  const entityRunDurationMs = Date.now() - entityRunStartedAtMs;
  const runSummary = metricsTracker.toRunSummary(runMetrics, {
    entityType,
    status: runStatus,
    errorKind: runErrorKind,
    durationMs: entityRunDurationMs,
    idBasedRiskScoringEnabled: runConfig.idBasedRiskScoringEnabled,
    namespace: runContext.namespace,
  });
  runLogger.info(`run summary ${JSON.stringify(runSummary)}`);
  metricsTracker.accumulate(runMetrics);
};

export type RegisterRiskScoreMaintainerDeps = RiskScoreMaintainerDeps;
