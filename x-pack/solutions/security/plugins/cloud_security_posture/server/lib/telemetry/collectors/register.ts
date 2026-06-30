/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type {
  CollectorFetchContext,
  UsageCollectionSetup,
} from '@kbn/usage-collection-plugin/server';
import type { CoreStart, Logger } from '@kbn/core/server';
import type { CspServerPluginStart, CspServerPluginStartDeps } from '../../../types';
import { getIndicesStats } from './indices_stats_collector';
import { getResourcesStats } from './resources_stats_collector';
import { cspmUsageSchema } from './schema';
import type { CspmUsage } from './types';
import { type CloudSecurityUsageCollectorType } from './types';
import { getAccountsStats } from './accounts_stats_collector';
import { getRulesStats } from './rules_stats_collector';
import { getInstallationStats } from './installation_stats_collector';
import { getAlertsStats } from './alert_stats_collector';
import { getAllCloudAccountsStats } from './cloud_accounts_stats_collector';
import { getMutedRulesStats } from './muted_rules_stats_collector';
import { getCspmCloudConnectorUsageStats } from './cspm_cloud_connector_usage_stats_collector';
import { INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE } from '../../../../common/constants';

/**
 * Maximum number of telemetry collectors that may run concurrently.
 *
 * Running all ~9 collectors in full parallel (Promise.all) was causing significant
 * memory spikes on Serverless because every collector fans out large aggregation
 * queries and holds the response payloads in memory simultaneously.  A concurrency
 * cap of 2 limits peak memory to roughly 2/9 of the fully-parallel case while
 * still completing well within the daily task time-budget.
 *
 * If the number of collectors grows substantially in the future, consider lowering
 * this value further or profiling the heaviest collectors and splitting them into a
 * separate, lower-priority task.
 */
const COLLECTOR_CONCURRENCY_LIMIT = 2;

export function registerCspmUsageCollector(
  logger: Logger,
  coreServices: Promise<[CoreStart, CspServerPluginStartDeps, CspServerPluginStart]>,
  usageCollection?: UsageCollectionSetup
): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered
  if (!usageCollection) {
    return;
  }

  // Create usage collector
  const cspmUsageCollector = usageCollection.makeUsageCollector<CspmUsage>({
    type: 'cloud_security_posture',
    isReady: async () => {
      await coreServices;
      return true;
    },
    fetch: async (collectorFetchContext: CollectorFetchContext) => {
      const awaitPromiseSafe = async <T>(
        taskName: CloudSecurityUsageCollectorType,
        promise: Promise<T>
      ): Promise<T | undefined> => {
        try {
          const val = await promise;
          logger.info(`Cloud Security telemetry: ${taskName} payload was sent successfully`);
          return val;
        } catch (error) {
          logger.error(`${taskName} task failed: ${error.message}`);
          logger.error(error.stack);
          return;
        }
      };

      const esClient = collectorFetchContext.esClient;
      const soClient = collectorFetchContext.soClient;
      const encryptedSoClient = (await coreServices)[0].savedObjects.createInternalRepository([
        INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
      ]);

      // Run collectors with bounded concurrency to cap peak memory usage.
      // See COLLECTOR_CONCURRENCY_LIMIT for rationale.
      const limit = pLimit(COLLECTOR_CONCURRENCY_LIMIT);

      const [
        indicesStats,
        accountsStats,
        resourcesStats,
        rulesStats,
        installationStats,
        alertsStats,
        cloudAccountStats,
        mutedRulesStats,
        cspmCloudConnectorUsageStats,
      ] = await Promise.all([
        limit(() =>
          awaitPromiseSafe('Indices', getIndicesStats(esClient, soClient, coreServices, logger))
        ),
        limit(() => awaitPromiseSafe('Accounts', getAccountsStats(esClient, logger))),
        limit(() => awaitPromiseSafe('Resources', getResourcesStats(esClient, logger))),
        limit(() => awaitPromiseSafe('Rules', getRulesStats(esClient, logger))),
        limit(() =>
          awaitPromiseSafe(
            'Installation',
            getInstallationStats(esClient, soClient, coreServices, logger)
          )
        ),
        limit(() => awaitPromiseSafe('Alerts', getAlertsStats(esClient, logger))),
        limit(() =>
          awaitPromiseSafe(
            'Cloud Accounts',
            getAllCloudAccountsStats(esClient, encryptedSoClient, logger)
          )
        ),
        limit(() =>
          awaitPromiseSafe('Muted Rules', getMutedRulesStats(soClient, encryptedSoClient, logger))
        ),
        limit(() =>
          awaitPromiseSafe(
            'CSPM Cloud Connector Usage',
            getCspmCloudConnectorUsageStats(soClient, coreServices, logger)
          )
        ),
      ]);
      return {
        indices: indicesStats,
        accounts_stats: accountsStats,
        resources_stats: resourcesStats,
        rules_stats: rulesStats,
        installation_stats: installationStats,
        alerts_stats: alertsStats,
        cloud_account_stats: cloudAccountStats,
        muted_rules_stats: mutedRulesStats,
        cspm_cloud_connector_usage_stats: cspmCloudConnectorUsageStats,
      };
    },
    schema: cspmUsageSchema,
  });

  // Register usage collector
  usageCollection.registerCollector(cspmUsageCollector);
}
