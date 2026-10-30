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
import type { ExperimentalFeatures } from '../../../../../common/experimental_features';
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
import {
  getRiskScoreBaseDistribution,
  getRiskScoreResolutionDistribution,
} from './risk_score_distribution';
import { fetchWatchlistConfigs } from './utils/fetch_watchlist_configs';
import { riskScoreLogMeta } from './instrumentation/risk_score_log_meta';
import { withLogContext } from './utils/with_log_context';
import { ensureLookupIndex, getLookupIndexName } from './lookup/lookup_index';
import { pruneLookupIndex } from './lookup/prune_lookup_index';
import { runResolutionScoringStep } from './steps/run_resolution_scoring_step';
import { createRunMetricsTracker } from './instrumentation/run_metrics_tracker';
import { createRunHealthTracker } from './instrumentation/run_health';
import { createRunInstrumentation } from './instrumentation/reporting';
import type { RunInstrumentation } from './instrumentation/reporting';
import { ESQL_PROFILE_PAGE_INTERVAL } from './instrumentation/esql_page_profile';
import { buildLookupIndex } from './steps/build_lookup_index';
import { DEFAULT_ALERT_SAMPLE_SIZE } from '../constants';
import { ENTITY_ANALYTICS_SPAN_NAMES, runWithSpan, wrapTaskRun } from '../../telemetry/traces';
import {
  buildRiskScoreEntityMaintainerRunSummary,
  buildRiskScorePhase0EntityMaintainerRunSummary,
  buildRiskScoreSkipEntityMaintainerRunSummary,
  type RiskScoreFrameworkStageSummary,
} from './entity_maintainer_run_summary';
export interface RiskScoreMaintainerDeps {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  entityAnalyticsConfig: EntityAnalyticsConfig;
  experimentalFeatures: ExperimentalFeatures;
  kibanaVersion: string;
  logger: Logger;
  auditLogger: AuditLogger | undefined;
  productFeaturesService: ProductFeaturesService;
  telemetry: AnalyticsServiceSetup;
}

type RiskScoreMaintainerConfig = Pick<RegisterEntityMaintainerConfig, 'setup' | 'run'>;
type FrameworkTelemetry = Parameters<NonNullable<RiskScoreMaintainerConfig['run']>>[0]['telemetry'];
type StartServices = Awaited<ReturnType<RiskScoreMaintainerDeps['getStartServices']>>;
type CoreStart = StartServices[0];
type PluginsStart = StartServices[1];
type RunMetricsTracker = ReturnType<typeof createRunMetricsTracker>;
type TelemetryReporter = ReturnType<typeof createRiskScoreMaintainerTelemetryReporter>;

type LookupIndexReadinessStatus = 'ready' | 'mapping_upgrade_failed';

interface LookupIndexReadiness {
  lookupIndex: string;
  status: LookupIndexReadinessStatus;
}

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
  /**
   * Gates the risk score maintainer's create-if-missing path (Phase 1 base scoring only).
   * Requires both `idBasedRiskScoringEnabled` and the `riskScoreCreateMissingEntitiesEnabled`
   * experimental feature flag, so creation can be enabled independently of dual-write.
   */
  createMissingEntitiesEnabled: boolean;
  watchlistConfigs: Awaited<ReturnType<typeof fetchWatchlistConfigs>>;
  writer: Awaited<ReturnType<RiskScoreDataClient['getWriter']>>;
  sampleSize: number;
  esqlProfiling: boolean;
  esqlProfilingInterval: number;
  pageSize: number;
  entityTypes: EntityType[];
}

export const createRiskScoreMaintainer = ({
  getStartServices,
  entityAnalyticsConfig,
  experimentalFeatures,
  kibanaVersion,
  logger,
  auditLogger,
  productFeaturesService,
  telemetry,
}: RiskScoreMaintainerDeps): RiskScoreMaintainerConfig => {
  const telemetryReporter = createRiskScoreMaintainerTelemetryReporter({
    telemetry,
  });
  const runHealthTracker = createRunHealthTracker();

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
      await ensureLookupIndexReady({
        esClient,
        namespace,
        logger,
        lifecycle: 'setup',
      });
      logger.info(`Risk score maintainer setup completed for namespace "${namespace}"`);
      return status.state;
    },
    run: async ({
      status,
      crudClient,
      signal,
      telemetry: frameworkTelemetry,
      setCustomTaskRunEventFields,
    }) => {
      return wrapTaskRun({
        spanName: ENTITY_ANALYTICS_SPAN_NAMES.maintainerRun,
        namespace: status.metadata.namespace,
        run: async () => {
          const runContext = await initializeRunContext({
            getStartServices,
            namespace: status.metadata.namespace,
            logger,
            kibanaVersion,
            auditLogger,
          });
          const canRun = await checkRunPrerequisites({
            telemetryReporter,
            frameworkTelemetry,
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
            experimentalFeatures,
          });

          const calculationRunId = uuidv4();
          const runNow = new Date().toISOString();
          const maintainerRunStartedAtMs = Date.now();
          const metricsTracker = createRunMetricsTracker();
          const runHealth = runHealthTracker.start();
          let outcome: 'success' | 'error' = 'success';
          const instrumentation = createRunInstrumentation({
            logger,
            telemetry,
            calculationRunId,
            namespace: runContext.namespace,
            setCustomTaskRunEventFields,
          });
          logger.info(
            'Risk score maintainer started',
            riskScoreLogMeta({
              calculationRunId,
              namespace: runContext.namespace,
              sampleSize: runConfig.sampleSize,
              pageSize: runConfig.pageSize,
              entityTypes: runConfig.entityTypes,
              esqlProfiling: runConfig.esqlProfiling,
              esqlProfilingInterval: runConfig.esqlProfilingInterval,
              idBasedRiskScoringEnabled: runConfig.idBasedRiskScoringEnabled,
            })
          );
          try {
            let stage0Ms: number | undefined;
            telemetryReporter.clearGlobalSkipReason();
            const phase0LookupStage = telemetryReporter.startPhase0LookupBuildStage({
              namespace: runContext.namespace,
              idBasedRiskScoringEnabled: runConfig.idBasedRiskScoringEnabled,
            });
            const phase0StartedAtMs = Date.now();
            try {
              const phase0Summary = await runWithSpan({
                name: ENTITY_ANALYTICS_SPAN_NAMES.phase0LookupBuild,
                namespace: runContext.namespace,
                cb: () =>
                  buildLookupIndex({
                    esClient: runContext.esClient,
                    crudClient,
                    logger,
                    lookupIndex: runContext.lookupIndex,
                    entityTypes: runConfig.entityTypes,
                    calculationRunId,
                    now: runNow,
                    abortSignal: signal,
                  }),
              });
              stage0Ms = Date.now() - phase0StartedAtMs;
              runHealth.mark('stage0');
              instrumentation.reportStage({
                stage: 'phase0_lookup_build',
                status: 'success',
                durationMs: stage0Ms,
              });
              phase0LookupStage.success({
                lookupRowsWritten: phase0Summary.lookupRowsWritten,
                entitiesIterated: phase0Summary.entitiesIterated,
                pagesProcessed: phase0Summary.pagesProcessed,
                bulkBatches: phase0Summary.bulkBatches,
                lookupRowsFailed: phase0Summary.lookupRowsFailed,
              });
              frameworkTelemetry.report(
                buildRiskScorePhase0EntityMaintainerRunSummary({
                  status: 'success',
                  durationMs: stage0Ms,
                  summary: phase0Summary,
                })
              );
            } catch (error) {
              instrumentation.reportStage({
                stage: 'phase0_lookup_build',
                status: 'error',
                durationMs: Date.now() - phase0StartedAtMs,
              });
              phase0LookupStage.error({ errorKind: 'unexpected' });
              frameworkTelemetry.report(
                buildRiskScorePhase0EntityMaintainerRunSummary({
                  status: 'error',
                  durationMs: Date.now() - phase0StartedAtMs,
                  errorKind: 'unexpected',
                })
              );
              outcome = 'error';
              throw error;
            }
            // Entity types are scored in parallel: each run reads alerts independently
            // and writes to the same risk-score data stream and entity store, with no
            // shared per-run state in this maintainer. A failure in one entity type
            // is logged and isolated so the remaining types still complete.
            await Promise.all(
              runConfig.entityTypes.map(async (entityType) => {
                if (signal.aborted) {
                  logger.info(
                    `Risk score maintainer run aborted before processing entity type "${entityType}"`
                  );
                  return;
                }
                try {
                  const entityOutcome = await runWithSpan({
                    name: ENTITY_ANALYTICS_SPAN_NAMES.entityTypeRun,
                    namespace: runContext.namespace,
                    attributes: { 'entity_analytics.entity_type': entityType },
                    cb: () =>
                      executeEntityTypeRun({
                        entityType,
                        crudClient,
                        logger,
                        abortSignal: signal,
                        telemetryReporter,
                        frameworkTelemetry,
                        metricsTracker,
                        runContext,
                        runConfig,
                        calculationRunId,
                        runNow,
                        instrumentation,
                        markStage: (stage) => runHealth.mark(`${entityType}.${stage}`),
                      }),
                  });
                  if (entityOutcome === 'error') outcome = 'error';
                } catch (error) {
                  outcome = 'error';
                  const errorMessage = error instanceof Error ? error.message : String(error);
                  logger.error(`Entity type "${entityType}" run failed: ${errorMessage}`);
                }
                runHealth.mark(entityType);
              })
            );

            const maintainerRunDurationMs = Date.now() - maintainerRunStartedAtMs;
            logger.info(
              `Risk score maintainer run completed for namespace "${runContext.namespace}" in ${maintainerRunDurationMs}ms`
            );
            const maintainerTotals = metricsTracker.toAggregateSummary({
              namespace: runContext.namespace,
              durationMs: maintainerRunDurationMs,
              stage0Ms,
              entityTypesProcessed: runConfig.entityTypes.length,
              idBasedRiskScoringEnabled: runConfig.idBasedRiskScoringEnabled,
            });
            logger.info(
              'Risk score maintainer totals',
              riskScoreLogMeta({
                calculationRunId,
                ...maintainerTotals,
                status: signal.aborted ? 'aborted' : outcome,
              })
            );
            return status.state;
          } finally {
            const health = runHealth.stop();
            instrumentation.finishRun(health, signal.aborted ? 'aborted' : outcome);
          }
        },
      });
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
  const { lookupIndex } = await ensureLookupIndexReady({
    esClient,
    namespace,
    logger,
    lifecycle: 'run',
  });

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

const ensureLookupIndexReady = async ({
  esClient,
  namespace,
  logger,
  lifecycle,
}: {
  esClient: CoreStart['elasticsearch']['client']['asInternalUser'];
  namespace: string;
  logger: Logger;
  lifecycle: 'setup' | 'run';
}): Promise<LookupIndexReadiness> => {
  try {
    return {
      lookupIndex: await ensureLookupIndex({ esClient, namespace }),
      status: 'ready',
    };
  } catch (error) {
    logger.error(
      `There was an error upgrading the lookup index mapping. Continuing with maintainer ${lifecycle}. ${
        error instanceof Error ? error.message : String(error)
      }`
    );

    return {
      lookupIndex: getLookupIndexName(namespace),
      status: 'mapping_upgrade_failed',
    };
  }
};

const checkRunPrerequisites = async ({
  telemetryReporter,
  frameworkTelemetry,
  productFeaturesService,
  pluginsStart,
  namespace,
  logger,
}: {
  // Dual telemetry: Entity Maintainers framework (`frameworkTelemetry`) plus the
  // legacy risk-score reporter (`telemetryReporter`). Goal is to migrate all
  // events onto the framework and retire the risk-score-specific reporter.
  telemetryReporter: TelemetryReporter;
  frameworkTelemetry: FrameworkTelemetry;
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
  frameworkTelemetry.report(buildRiskScoreSkipEntityMaintainerRunSummary({ skipReason }));
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
  experimentalFeatures,
}: {
  coreStart: CoreStart;
  soClient: ReturnType<typeof buildScopedInternalSavedObjectsClientUnsafe>;
  internalSoClient: ReturnType<typeof buildInternalSavedObjectsClientUnsafe>;
  esClient: CoreStart['elasticsearch']['client']['asInternalUser'];
  riskScoreDataClient: RiskScoreDataClient;
  namespace: string;
  logger: Logger;
  entityAnalyticsConfig: EntityAnalyticsConfig;
  experimentalFeatures: ExperimentalFeatures;
}): Promise<LoadedRunConfig> => {
  const configuration: RiskEngineConfiguration =
    (await getConfiguration({ savedObjectsClient: soClient, logger, namespace })) ??
    getDefaultRiskEngineConfiguration({ namespace });
  const dataViewId = configuration.dataViewId ?? getAlertsIndex(namespace);
  const { index: alertsIndex } = await riskScoreDataClient.getRiskInputsIndex({ dataViewId });
  const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);
  const idBasedRiskScoringEnabled = await getIsIdBasedRiskScoringEnabled(uiSettingsClient);
  const createMissingEntitiesEnabled =
    idBasedRiskScoringEnabled && experimentalFeatures.riskScoreCreateMissingEntitiesEnabled;
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
    DEFAULT_ALERT_SAMPLE_SIZE;
  const pageSize = configuration.pageSize ?? DEFAULT_RISK_SCORE_PAGE_SIZE;
  const entityTypes = configuration.identifierType
    ? [configuration.identifierType]
    : getEntityAnalyticsEntityTypes();

  return {
    configuration,
    alertsIndex,
    idBasedRiskScoringEnabled,
    createMissingEntitiesEnabled,
    watchlistConfigs,
    writer,
    sampleSize,
    esqlProfiling: entityAnalyticsConfig?.riskEngine?.esqlProfiling ?? true,
    esqlProfilingInterval:
      entityAnalyticsConfig?.riskEngine?.esqlProfilingInterval ?? ESQL_PROFILE_PAGE_INTERVAL,
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
  frameworkTelemetry,
  metricsTracker,
  runContext,
  runConfig,
  calculationRunId,
  runNow,
  markStage,
  instrumentation,
}: {
  entityType: EntityType;
  crudClient: Parameters<NonNullable<RiskScoreMaintainerConfig['run']>>[0]['crudClient'];
  logger: Logger;
  abortSignal?: AbortSignal;
  // Dual telemetry: Entity Maintainers framework (`frameworkTelemetry`) plus the
  // legacy risk-score reporter (`telemetryReporter`). Goal is to migrate all
  // events onto the framework and retire the risk-score-specific reporter.
  telemetryReporter: TelemetryReporter;
  frameworkTelemetry: FrameworkTelemetry;
  metricsTracker: RunMetricsTracker;
  runContext: InitializedRunContext;
  runConfig: LoadedRunConfig;
  calculationRunId: string;
  runNow: string;
  markStage: (stage: RiskScoreFrameworkStageSummary['name']) => void;
  instrumentation: RunInstrumentation;
}): Promise<'success' | 'error' | 'aborted' | undefined> => {
  const entityRunStartedAtMs = Date.now();
  const runLogger = withLogContext(
    logger,
    `[risk_score_maintainer][${entityType}][run:${calculationRunId}]`,
    riskScoreLogMeta({ calculationRunId, namespace: runContext.namespace, entityType })
  );
  let runStatus: 'success' | 'error' | 'aborted' = 'success';
  const markRunError = () => {
    runStatus = 'error';
  };
  let runErrorKind: MaintainerErrorKind | undefined;
  const runMetrics = metricsTracker.newRun();
  const frameworkTelemetryStages: RiskScoreFrameworkStageSummary[] = [];
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
  const baseStartedAtMs = Date.now();
  const profiling = {
    profile: runConfig.esqlProfiling,
    profileInterval: runConfig.esqlProfilingInterval,
  };
  const basePageTimings = instrumentation.createPageTimings(entityType, 'base', profiling);

  try {
    const baseSummary = await runWithSpan({
      name: ENTITY_ANALYTICS_SPAN_NAMES.stageBase,
      namespace: runContext.namespace,
      attributes: { 'entity_analytics.entity_type': entityType },
      cb: () =>
        scoreBaseEntities({
          alertFilters,
          alertsIndex: runConfig.alertsIndex,
          crudClient,
          entityType,
          esClient: runContext.esClient,
          logger: runLogger,
          now: runNow,
          calculationRunId,
          pageSize: runConfig.pageSize,
          sampleSize: runConfig.sampleSize,
          watchlistConfigs: runConfig.watchlistConfigs,
          abortSignal,
          idBasedRiskScoringEnabled: runConfig.idBasedRiskScoringEnabled,
          createMissingEntities: runConfig.createMissingEntitiesEnabled,
          writer: runConfig.writer,
          pageTimings: basePageTimings,
        }),
    });
    runLogger.debug('completed base scoring pass');
    metricsTracker.recordBase(runMetrics, baseSummary);
    baseStage.success({
      pagesProcessed: baseSummary.pagesProcessed,
      scoresWritten: baseSummary.scoresWrittenRiskIndex,
      scoresMissingFromStore: baseSummary.scoresMissingFromStore,
      entitiesCreated: baseSummary.entitiesCreated,
      entityCreationsSkipped: baseSummary.entityCreationsSkipped,
      entityCreationsFailed: baseSummary.entityCreationsFailed,
    });
    frameworkTelemetryStages.push({
      name: 'base',
      status: 'success',
      durationMs: Date.now() - baseStartedAtMs,
      applied: baseSummary.scoresWrittenEntityStore + baseSummary.entitiesCreated,
    });
  } catch (error) {
    const errorMessage = telemetryReporter.getErrorMessage(error);
    markRunError();
    runErrorKind = 'unexpected';
    runLogger.error(`base scoring failed: ${errorMessage}`);
    baseStage.error({ errorKind: 'unexpected' });
    runTelemetry.errorSummary({ errorKind: 'unexpected' });

    frameworkTelemetryStages.push({
      name: 'base',
      status: 'error',
      durationMs: Date.now() - baseStartedAtMs,
      errorKind: 'unexpected',
    });
    const timing = instrumentation.finishStage(
      { entityType, stage: 'base', status: 'error', durationMs: Date.now() - baseStartedAtMs },
      basePageTimings
    );
    metricsTracker.recordPageProgress(runMetrics, 'base', timing);
    markStage('base');
    frameworkTelemetry.report(
      buildRiskScoreEntityMaintainerRunSummary({
        entityType,
        metrics: runMetrics,
        stages: frameworkTelemetryStages,
      })
    );

    throw error;
  }
  const baseTiming = instrumentation.finishStage(
    { entityType, stage: 'base', status: 'success', durationMs: Date.now() - baseStartedAtMs },
    basePageTimings
  );
  metricsTracker.recordPageProgress(runMetrics, 'base', baseTiming);
  markStage('base');

  checkAbortBetweenStages();

  if (!skipRemainingStages) {
    // Stage 2: score resolution targets (group scores).
    const resolutionStage = runTelemetry.startResolutionStage();
    const resolutionStartedAtMs = Date.now();
    const resolutionPageTimings = instrumentation.createPageTimings(
      entityType,
      'resolution',
      profiling
    );
    let resolutionStatus: 'success' | 'skipped' | 'error' = 'success';
    try {
      const resolutionResult = await runWithSpan({
        name: ENTITY_ANALYTICS_SPAN_NAMES.stageResolution,
        namespace: runContext.namespace,
        attributes: { 'entity_analytics.entity_type': entityType },
        cb: () =>
          runResolutionScoringStep({
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
            alertFilters,
            pageTimings: resolutionPageTimings,
          }),
      });
      metricsTracker.recordResolution(runMetrics, resolutionResult);
      if (resolutionResult.skippedReason) {
        resolutionStatus = 'skipped';
        resolutionStage.skipped(resolutionResult.skippedReason);
        frameworkTelemetryStages.push({
          name: 'resolution',
          status: 'skipped',
          durationMs: Date.now() - resolutionStartedAtMs,
          skipReason: resolutionResult.skippedReason,
          applied: resolutionResult.scoresWrittenEntityStore,
        });
      } else {
        resolutionStage.success({
          pagesProcessed: resolutionResult.pagesProcessed,
          scoresWritten: resolutionResult.scoresWrittenRiskIndex,
        });
        frameworkTelemetryStages.push({
          name: 'resolution',
          status: 'success',
          durationMs: Date.now() - resolutionStartedAtMs,
          applied: resolutionResult.scoresWrittenEntityStore,
        });
      }
    } catch (error) {
      const errorMessage = telemetryReporter.getErrorMessage(error);
      markRunError();
      runErrorKind = 'unexpected';
      runLogger.error(`resolution scoring failed: ${errorMessage}`);
      resolutionStatus = 'error';
      resolutionStage.error({ errorKind: 'unexpected' });
      frameworkTelemetryStages.push({
        name: 'resolution',
        status: 'error',
        durationMs: Date.now() - resolutionStartedAtMs,
        errorKind: 'unexpected',
      });
    }
    const resolutionTiming = instrumentation.finishStage(
      {
        entityType,
        stage: 'resolution',
        status: resolutionStatus,
        durationMs: Date.now() - resolutionStartedAtMs,
      },
      resolutionPageTimings
    );
    metricsTracker.recordPageProgress(runMetrics, 'resolution', resolutionTiming);
    markStage('resolution');
  } else {
    frameworkTelemetryStages.push({
      name: 'resolution',
      status: 'skipped',
      durationMs: 0,
      skipReason: 'aborted',
    });
  }

  checkAbortBetweenStages();

  let baseScoreDistribution: Awaited<ReturnType<typeof getRiskScoreBaseDistribution>>;
  let resolutionScoreDistribution: Awaited<ReturnType<typeof getRiskScoreResolutionDistribution>>;
  let scoreDistributionsMs: number | undefined;
  let pruneMs: number | undefined;

  if (!skipRemainingStages) {
    // Refresh the risk score data stream so reset-to-zero can see scores written in phases 1 & 2.
    // Without this, the ES|QL query in reset may not see the new documents and could incorrectly
    // zero out scores that were just written in this run.
    const { alias: riskScoreAlias } = getIndexPatternDataStream(runContext.namespace);
    await runContext.esClient.indices.refresh({ index: riskScoreAlias });

    // Stage 3: reset stale positive scores not touched in this run.
    if (runConfig.configuration.enableResetToZero !== false) {
      const resetStage = runTelemetry.startResetStage();
      const resetStartedAtMs = Date.now();
      try {
        const resetResult = await runWithSpan({
          name: ENTITY_ANALYTICS_SPAN_NAMES.stageResetToZero,
          namespace: runContext.namespace,
          attributes: { 'entity_analytics.entity_type': entityType },
          cb: () =>
            resetToZero({
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
            }),
        });
        metricsTracker.recordResetToZero(runMetrics, resetResult);
        if (resetResult.scoresWrittenRiskIndex > 0) {
          runLogger.info(`reset ${resetResult.scoresWrittenRiskIndex} stale risk scores to zero`);
        } else {
          runLogger.debug('reset_to_zero found no stale scores');
        }
        resetStage.success({
          scoresWritten: resetResult.scoresWrittenRiskIndex,
          resetBatchLimitHit: resetResult.resetBatchLimitHit,
        });
        frameworkTelemetryStages.push({
          name: 'reset_to_zero',
          status: 'success',
          durationMs: Date.now() - resetStartedAtMs,
          applied: resetResult.scoresWrittenEntityStore,
        });
      } catch (error) {
        const errorMessage = telemetryReporter.getErrorMessage(error);
        markRunError();
        runErrorKind = 'unexpected';
        resetStage.error({ errorKind: 'unexpected' });
        frameworkTelemetryStages.push({
          name: 'reset_to_zero',
          status: 'error',
          durationMs: Date.now() - resetStartedAtMs,
          errorKind: 'unexpected',
        });
        runLogger.error(`error resetting risk scores to zero: ${errorMessage}`);
      }
    } else {
      runLogger.debug('reset_to_zero disabled in configuration');
      runTelemetry.startResetStage().skipped();
      frameworkTelemetryStages.push({
        name: 'reset_to_zero',
        status: 'skipped',
        durationMs: 0,
        skipReason: 'reset_to_zero_disabled',
      });
    }

    // Refresh so the distribution queries see zero-score records written by reset-to-zero above.
    // Wrapped in try/catch: a refresh failure must not abort the run — scoring and reset already
    // completed successfully, and the distributions are optional telemetry.
    const scoreDistributionsStartedAtMs = Date.now();
    let scoreDistributionsFailed = false;
    try {
      await runContext.esClient.indices.refresh({ index: riskScoreAlias });
      const distributionQuery = {
        esClient: runContext.esClient,
        namespace: runContext.namespace,
        entityType,
        calculationRunId,
        logger: runLogger,
      };
      [baseScoreDistribution, resolutionScoreDistribution] = await Promise.all([
        getRiskScoreBaseDistribution(distributionQuery),
        getRiskScoreResolutionDistribution(distributionQuery),
      ]);
    } catch (error) {
      scoreDistributionsFailed = true;
      runLogger.warn(
        `Failed to refresh before collecting score distributions; distributions will be omitted from the run summary: ${telemetryReporter.getErrorMessage(
          error
        )}`
      );
    } finally {
      scoreDistributionsMs = Date.now() - scoreDistributionsStartedAtMs;
      markStage('score_distributions');
      frameworkTelemetryStages.push({
        name: 'score_distributions',
        status: scoreDistributionsFailed ? 'error' : 'success',
        durationMs: scoreDistributionsMs,
      });
    }
  } else {
    frameworkTelemetryStages.push({
      name: 'reset_to_zero',
      status: 'skipped',
      durationMs: 0,
      skipReason: 'aborted',
    });
  }

  checkAbortBetweenStages();

  if (!skipRemainingStages) {
    // Final cleanup: remove old lookup docs outside the current risk window.
    const riskWindowStart = runConfig.configuration.range?.start ?? 'now-30d';
    const pruneStartedAtMs = Date.now();
    let pruneFailed = false;
    try {
      const prunedDocs = await pruneLookupIndex({
        esClient: runContext.esClient,
        index: runContext.lookupIndex,
        riskWindowStart,
        calculationRunId,
      });
      metricsTracker.recordPrune(runMetrics, prunedDocs);
      if (prunedDocs > 0) {
        runLogger.debug(`pruned ${prunedDocs} stale lookup documents`);
      }
    } catch (error) {
      markRunError();
      runErrorKind = 'unexpected';
      pruneFailed = true;
      runLogger.error(`error pruning lookup index: ${telemetryReporter.getErrorMessage(error)}`);
    } finally {
      pruneMs = Date.now() - pruneStartedAtMs;
      markStage('prune');
      frameworkTelemetryStages.push({
        name: 'prune',
        status: pruneFailed ? 'error' : 'success',
        durationMs: pruneMs,
      });
    }
  }

  runTelemetry.completionSummary({
    runStatus,
    runErrorKind,
    scoresWrittenBase: runMetrics.scoresWrittenRiskIndexBase,
    scoresWrittenResolution: runMetrics.scoresWrittenRiskIndexResolution,
    scoresWrittenResetToZero: runMetrics.scoresWrittenRiskIndexResetToZero,
    pagesProcessed: runMetrics.pagesProcessed,
    lookupPrunedDocs: runMetrics.lookupPrunedDocs,
    baseScoreDistribution,
    resolutionScoreDistribution,
  });

  frameworkTelemetry.report(
    buildRiskScoreEntityMaintainerRunSummary({
      entityType,
      metrics: runMetrics,
      stages: frameworkTelemetryStages,
    })
  );

  frameworkTelemetryStages
    .filter(({ name }) => ['reset_to_zero', 'score_distributions', 'prune'].includes(name))
    .forEach(({ name, status: stageStatus, durationMs }) => {
      instrumentation.reportStage({ entityType, stage: name, status: stageStatus, durationMs });
    });

  const entityRunDurationMs = Date.now() - entityRunStartedAtMs;
  const stageDurationMs = (name: RiskScoreFrameworkStageSummary['name']) =>
    frameworkTelemetryStages.find((stage) => stage.name === name)?.durationMs;
  const runSummary = metricsTracker.toRunSummary(runMetrics, {
    entityType,
    status: runStatus,
    errorKind: runErrorKind,
    durationMs: entityRunDurationMs,
    stageDurationsMs: {
      base: stageDurationMs('base'),
      resolution: stageDurationMs('resolution'),
      resetToZero: stageDurationMs('reset_to_zero'),
      scoreDistributions: scoreDistributionsMs,
      prune: pruneMs,
    },
    idBasedRiskScoringEnabled: runConfig.idBasedRiskScoringEnabled,
    namespace: runContext.namespace,
  });
  runLogger.info(
    'Risk score entity run summary',
    riskScoreLogMeta({ calculationRunId, ...runSummary })
  );
  return runStatus;
};

export type RegisterRiskScoreMaintainerDeps = RiskScoreMaintainerDeps;
