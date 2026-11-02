/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { PackageService } from '@kbn/fleet-plugin/server';
import type { CollectorFetchContext, ICollectorSet } from '@kbn/usage-collection-plugin/server';
import { CASE_SAVED_OBJECT } from '@kbn/cases-plugin/common/constants';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import type { DetectorF } from '../types';
import { Milestone } from '../../../../common/trial_companion/types';

export interface UsageCollectorDeps {
  logger: Logger;
  collectorContext: CollectorFetchContext;
  usageCollection: ICollectorSet;
}

export const installedPackagesM1 = (
  logger: Logger,
  packageService: PackageService,
  esClient: ElasticsearchClient
): DetectorF => {
  return async (): Promise<Milestone | undefined> => {
    try {
      logger.debug('verifyNonDefaultPackagesInstalled: Fetching Fleet packages');

      const packages = await packageService.asInternalUser.getPackages();
      const installedPackageNames = packages
        .filter((pkg) => pkg.status === 'installed')
        .map((pkg) => pkg.name);
      // filter out defaults security_ai_prompts, security_detection_engine, elastic_agent, fleet_server
      const defaultPackages = [
        'endpoint', // installed by default on serverless even if not visible in the UI (see Slack thread), TODO: should be handled differently for ECH
        'security_ai_prompts',
        'security_detection_engine',
        'elastic_agent',
        'fleet_server',
      ];
      const nonDefaultPackages = installedPackageNames.filter(
        (pkg) => !defaultPackages.includes(pkg)
      );
      logger.debug(
        `verifyNonDefaultPackagesInstalled: Fetched Fleet packages: ${
          packages.length
        } items, non-default packages: ${
          nonDefaultPackages.length
        }, installed package names: ${nonDefaultPackages.join(', ')}`
      );

      const agentLogs = await esClient.count({
        index: 'logs-elastic_agent*',
      });
      logger.debug(`agentLogs: ${JSON.stringify(agentLogs)}`);

      if (nonDefaultPackages.length === 0 || !agentLogs.count || agentLogs.count === 0) {
        return Milestone.M1;
      }
      return undefined;
    } catch (error) {
      logger.error('installedPackagesM1: Error fetching installed packages or agent logs', error);
      throw error;
    }
  };
};

export const detectionRulesInstalledM3 = (deps: UsageCollectorDeps): DetectorF => {
  return async (): Promise<Milestone | undefined> => {
    // Extract enabled rule count from detection_rules usage
    interface SecuritySolutionTelemetry {
      detectionMetrics?: {
        detection_rules?: {
          detection_rule_usage?: {
            custom_total?: { enabled?: number };
            elastic_total?: { enabled?: number };
          };
        };
      };
    }
    const result = await fetchCollectorResults<SecuritySolutionTelemetry>(
      'security_solution',
      deps
    );

    const detectionMetrics = result?.detectionMetrics;
    const detectionRules = detectionMetrics?.detection_rules;
    const ruleUsage = detectionRules?.detection_rule_usage;

    const customEnabled = ruleUsage?.custom_total?.enabled ?? 0;
    const elasticEnabled = ruleUsage?.elastic_total?.enabled ?? 0;
    const rulesCount = customEnabled + elasticEnabled;

    deps.logger.debug(
      `detectionRulesInstalledM3: Rules count - custom: ${customEnabled}, elastic: ${elasticEnabled}, total: ${rulesCount}`
    );
    return rulesCount > 0 ? undefined : Milestone.M3;
  };
};

export const casesM6 = (deps: UsageCollectorDeps): DetectorF => {
  return async (): Promise<Milestone | undefined> => {
    interface SavedObjectsCountsTelemetry {
      by_type?: [{ type: string; count: number }];
    }

    const result = await fetchCollectorResults<SavedObjectsCountsTelemetry>(
      'saved_objects_counts',
      deps
    );
    const count = result?.by_type?.find((item) => item.type === CASE_SAVED_OBJECT)?.count ?? 0;
    deps.logger.debug(`casesM6 total: ${count}`);
    return count > 0 ? undefined : Milestone.M6;
  };
};

export const savedDiscoverySessionsM2 = (deps: UsageCollectorDeps): DetectorF => {
  return async (): Promise<Milestone | undefined> => {
    const { total } = await deps.collectorContext.soClient.find({
      type: SavedSearchType,
      perPage: 0,
      page: 0,
      filter: `search.managed:(false)`,
    });

    return total > 0 ? undefined : Milestone.M2;
  };
};

export const aiFeaturesM5 = (esClient: ElasticsearchClient): DetectorF => {
  return async (): Promise<Milestone | undefined> => {
    const deltaT = 'now-30d';
    const attackDiscoveryResponse = await esClient.count({
      index: '.alerts-security.attack.discovery.alerts-*',
      query: {
        range: {
          '@timestamp': {
            gte: deltaT,
          },
        },
      },
    });
    if (attackDiscoveryResponse.count > 0) {
      return undefined;
    }
    const aiAssistantResponse = await esClient.count({
      index: '.kibana-elastic-ai-assistant-conversations-*',
      query: {
        range: {
          '@timestamp': {
            gte: deltaT,
          },
        },
      },
    });
    if (aiAssistantResponse.count > 0) {
      return undefined;
    }
    const aiChatsResponse = await esClient.count({
      index: '.chat-conversations*',
      query: {
        range: {
          updated_at: {
            gte: deltaT,
          },
        },
      },
    });
    if (aiChatsResponse.count > 0) {
      return undefined;
    }
    return Milestone.M5;
  };
};

async function fetchCollectorResults<T>(
  collectorType: string,
  { logger, collectorContext, usageCollection }: UsageCollectorDeps
): Promise<T | undefined> {
  try {
    const collector = usageCollection.getCollectorByType(collectorType);
    if (!collector) {
      logger.warn(`collectorType ${collectorType} not found`);
      return undefined;
    }
    // Fetch the telemetry data from the collectorType with proper context
    const result = await collector.fetch(collectorContext);
    if (!result) {
      return undefined;
    }

    return result as T;
  } catch (error) {
    logger.error(`fetchCollectorResults: Error fetching security solution telemetry: ${error}`);
    throw error;
  }
}
