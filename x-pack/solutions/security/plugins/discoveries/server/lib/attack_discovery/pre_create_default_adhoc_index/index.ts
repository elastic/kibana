/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ECS_COMPONENT_TEMPLATE_NAME } from '@kbn/alerting-plugin/server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';

/** How long to wait for the alerting framework to install `.alerts-ecs-mappings`. */
const ECS_COMPONENT_TEMPLATE_WAIT_TIMEOUT_MS = 60_000;
const ECS_COMPONENT_TEMPLATE_POLL_INTERVAL_MS = 500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface FrameworkAlerts {
  enabled: () => boolean;
}

export interface PreCreateDefaultAdhocAttackDiscoveryIndexParams {
  core: CoreSetup;
  dataClient: IRuleDataClient;
  frameworkAlerts?: FrameworkAlerts;
  logger: Logger;
}

/**
 * The ad-hoc index template references `.alerts-ecs-mappings`. That component
 * template is installed asynchronously by the alerting framework, and there is
 * no setup contract for that step. Poll until it exists so getWriter() does
 * not create a concrete index with empty mappings.
 */
const waitForEcsComponentTemplate = async (core: CoreSetup, logger: Logger): Promise<boolean> => {
  const [coreStart] = await core.getStartServices();
  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const deadline = Date.now() + ECS_COMPONENT_TEMPLATE_WAIT_TIMEOUT_MS;
  let lastError: unknown;

  while (Date.now() <= deadline) {
    try {
      await esClient.cluster.getComponentTemplate({ name: ECS_COMPONENT_TEMPLATE_NAME });
      return true;
    } catch (error: unknown) {
      lastError = error;
      if (Date.now() >= deadline) {
        break;
      }
      await delay(ECS_COMPONENT_TEMPLATE_POLL_INTERVAL_MS);
    }
  }

  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
  logger.warn(
    `Unable to pre-create ad-hoc Attack Discovery index for the default space: ${ECS_COMPONENT_TEMPLATE_NAME} is not available: ${errorMessage}`
  );
  return false;
};

/**
 * Creates `.adhoc.alerts-security.attack.discovery.alerts-default` without writing documents.
 * Does not block plugin setup.
 */
export const preCreateDefaultAdhocAttackDiscoveryIndex = ({
  core,
  dataClient,
  frameworkAlerts,
  logger,
}: PreCreateDefaultAdhocAttackDiscoveryIndexParams): void => {
  // initializeIndex installs shared templates only. The concrete alias is created
  // by getWriter(). When framework alerts are on, wait until `.alerts-ecs-mappings`
  // exists: calling getWriter() earlier creates the concrete index with empty mappings.
  void (async () => {
    try {
      if (frameworkAlerts?.enabled()) {
        const ecsMappingsReady = await waitForEcsComponentTemplate(core, logger);
        if (!ecsMappingsReady) {
          return;
        }
      }

      await dataClient.getWriter({ namespace: 'default' });
    } catch (error: unknown) {
      // e.g. RuleDataWriteDisabledError when rule-registry writes are disabled.
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(
        `Unable to pre-create ad-hoc Attack Discovery index for the default space: ${errorMessage}`
      );
    }
  })();
};
