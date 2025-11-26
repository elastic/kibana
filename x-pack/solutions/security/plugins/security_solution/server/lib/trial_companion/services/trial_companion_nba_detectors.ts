/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { PackageService } from '@kbn/fleet-plugin/server';
import type {
  CollectorFetchContext,
  UsageCollectionSetup,
} from '@kbn/usage-collection-plugin/server';
import type { DetectorF } from '../types';
import { Milestone } from '../../../../common/trial_companion/types';

// M1 - data
export const installedPackages = (logger: Logger, packageService: PackageService): DetectorF => {
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
      logger.info(
        `verifyNonDefaultPackagesInstalled: Fetched Fleet packages: ${
          packages.length
        } items, non-default packages: ${
          nonDefaultPackages.length
        }, installed package names: ${nonDefaultPackages.join(', ')}`
      );

      if (nonDefaultPackages.length === 0) {
        return Milestone.M1;
      }
      return undefined;
    } catch (error) {
      logger.error('verifyNonDefaultPackagesInstalled: Error fetching Fleet packages', error);
      throw error;
    }
  };
};

// M7 - for testing / demo purposes
export const allSet = (logger: Logger): DetectorF => {
  return async (): Promise<Milestone | undefined> => {
    logger.info('allSet: all conditions met for the highest milestone');
    return Milestone.M7;
  };
};

// M3 - detections
export const detectionRulesInstalled = (
  logger: Logger,
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  usageCollection?: UsageCollectionSetup
): DetectorF => {
  return async (): Promise<Milestone | undefined> => {
    const collectorContext = {
      esClient,
      soClient,
    } as CollectorFetchContext;
    logger.info('detectionRulesInstalled: Fetching rules telemetry from usage collector');
    if (!usageCollection) {
      logger.warn('detectionRulesInstalled: usageCollection is not available');
      return undefined;
    }

    try {
      const securitySolutionCollector = usageCollection.getCollectorByType('security_solution');

      if (!securitySolutionCollector) {
        logger.warn('detectionRulesInstalled: security_solution collector not found');
        return undefined;
      }

      // Fetch the telemetry data from the collector with proper context
      const securitySolutionResult = await securitySolutionCollector.fetch(collectorContext);

      logger.info(
        `detectionRulesInstalled: Security solution telemetry result keys: ${Object.keys(
          securitySolutionResult || {}
        ).join(', ')}`
      );

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
      const detectionMetrics = (securitySolutionResult as SecuritySolutionTelemetry)
        ?.detectionMetrics;
      const detectionRules = detectionMetrics?.detection_rules;
      const ruleUsage = detectionRules?.detection_rule_usage;

      const customEnabled = ruleUsage?.custom_total?.enabled ?? 0;
      const elasticEnabled = ruleUsage?.elastic_total?.enabled ?? 0;
      const rulesCount = customEnabled + elasticEnabled;

      logger.debug(
        `verifyEnabledSecurityRulesCount: Rules count - custom: ${customEnabled}, elastic: ${elasticEnabled}, total: ${rulesCount}`
      );
      return rulesCount > 0 ? undefined : Milestone.M3;
    } catch (error) {
      logger.error(
        `verifyEnabledSecurityRulesCount: Error fetching security solution telemetry: ${error}`
      );
      return undefined;
    }
  };
};

// M2 - explore your data
export const savedSearches = (
  logger: Logger,
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  usageCollection?: UsageCollectionSetup
): DetectorF => {
  return async (): Promise<Milestone | undefined> => {
    const collectorContext = {
      esClient,
      soClient,
    } as CollectorFetchContext;
    logger.info('detectionRulesInstalled: Fetching rules telemetry from usage collector');
    if (!usageCollection) {
      logger.warn('detectionRulesInstalled: usageCollection is not available');
      return undefined;
    }

    try {
      const rollupsCollector = usageCollection.getCollectorByType('rollups');
      if (!rollupsCollector) {
        logger.warn('savedSearches: rollups collector not found');
        return undefined;
      }
      // Fetch the telemetry data from the collector with proper context
      const rollupsResult = await rollupsCollector.fetch(collectorContext);

      logger.info(`Rollups: ${JSON.stringify(rollupsResult, null, 2)}`);

      return undefined;
    } catch (error) {
      logger.error(`savedSearches: Error fetching security solution telemetry: ${error}`);
      return undefined;
    }
  };
};
