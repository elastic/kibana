/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ECS_COMPONENT_TEMPLATE_NAME } from '@kbn/alerting-plugin/server';
import { ATTACK_DISCOVERY_ALERTS_CONTEXT } from '@kbn/attack-discovery-schedules-common';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';

/** How long to wait for the alerting framework to install `.alerts-ecs-mappings`. */
const ECS_COMPONENT_TEMPLATE_WAIT_TIMEOUT_MS = 60_000;
const ECS_COMPONENT_TEMPLATE_POLL_INTERVAL_MS = 500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ContextInitializationResult {
  result: boolean;
  error?: string;
}

interface FrameworkAlerts {
  enabled: () => boolean;
  getContextInitializationPromise?: (
    context: string,
    namespace: string
  ) => Promise<ContextInitializationResult>;
}

const CONTEXT_NOT_REGISTERED = 'has not been registered';

export interface PreCreateDefaultAdhocAttackDiscoveryIndexParams {
  core: CoreSetup;
  dataClient: IRuleDataClient;
  frameworkAlerts?: FrameworkAlerts;
  logger: Logger;
}

/**
 * Polls until `.alerts-ecs-mappings` exists. Used only when the Attack Discovery
 * alerts context was not registered, so there is no initialization promise to wait on.
 * Existence is not enough on upgrade: a previous Kibana version's template is
 * already present, and getWriter() would apply those mappings.
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
 * Waits until the alerting framework has installed the current `.alerts-ecs-mappings`.
 * Returns false when that install failed and the concrete index must not be created.
 */
const waitForCurrentEcsMappings = async (
  core: CoreSetup,
  frameworkAlerts: FrameworkAlerts,
  logger: Logger
): Promise<boolean> => {
  if (frameworkAlerts.getContextInitializationPromise) {
    const initialization = await frameworkAlerts.getContextInitializationPromise(
      ATTACK_DISCOVERY_ALERTS_CONTEXT,
      'default'
    );
    if (initialization.result) {
      return true;
    }
    // The schedule rule type is registered by elastic_assistant. When that plugin
    // is absent the context was never registered, and the existence poll is the
    // remaining signal that the component template is installed.
    if (!initialization.error?.includes(CONTEXT_NOT_REGISTERED)) {
      logger.warn(
        `Unable to pre-create ad-hoc Attack Discovery index for the default space: alerting resources were not initialized${
          initialization.error ? `: ${initialization.error}` : ''
        }`
      );
      return false;
    }
  }

  return waitForEcsComponentTemplate(core, logger);
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
  // by getWriter(). When framework alerts are on, wait until the current
  // `.alerts-ecs-mappings` is installed: calling getWriter() earlier creates the
  // concrete index with empty or stale mappings.
  void (async () => {
    try {
      if (frameworkAlerts?.enabled()) {
        const ecsMappingsReady = await waitForCurrentEcsMappings(core, frameworkAlerts, logger);
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
