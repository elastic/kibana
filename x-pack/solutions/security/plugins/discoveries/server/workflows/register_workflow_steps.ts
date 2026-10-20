/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { CoreStart } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { isWorkflowsEnabled } from '@kbn/discoveries/impl/lib/helpers/is_workflows_enabled';
import type { DiscoveriesPluginStartDeps } from '../types';
import { getDefaultAlertRetrievalStepDefinition } from './steps/default_alert_retrieval_step';
import { getDefaultValidationStepDefinition } from './steps/default_validation_step';
import { getGenerateStepDefinition } from './steps/generate_step';
import { getPersistDiscoveriesStepDefinition } from './steps/persist_discoveries_step';
import { getRunStepDefinition } from './steps/run_step';
import { withWorkflowsEnabledGuard } from './with_workflows_enabled_guard';

export interface StepRegistrationResult {
  failedSteps: Array<{ error: string; id: string }>;
  registeredSteps: string[];
}

type StepRegistrationOutcome =
  | { error: string; id: string; success: false }
  | { id: string; success: true };

type GetStartServices = () => Promise<{
  coreStart: CoreStart;
  pluginsStart: DiscoveriesPluginStartDeps;
}>;

const tryRegisterStep = ({
  getStartServices,
  logger,
  stepDefinition,
  workflowsExtensions,
}: {
  getStartServices: GetStartServices;
  logger: Logger;
  stepDefinition: { id: string };
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}): StepRegistrationOutcome => {
  try {
    // Register a flag-gated loader instead of the definition directly. The
    // Workflows step registry resolves the loader after start (when the feature
    // flag is readable); resolving `undefined` skips registration, so the step
    // type is not registered at all while the flag is OFF. The `withWorkflowsEnabledGuard`
    // wrapping on the definition is retained as the live toggle-off kill-switch.
    const loader = async () => {
      const { coreStart } = await getStartServices();

      if (!(await isWorkflowsEnabled(coreStart.featureFlags))) {
        logger.debug(
          () =>
            `Attack Discovery workflows disabled; skipping registration of step '${stepDefinition.id}'`
        );
        return undefined;
      }

      return stepDefinition;
    };

    workflowsExtensions.registerStepDefinition(
      loader as Parameters<WorkflowsExtensionsServerPluginSetup['registerStepDefinition']>[0]
    );
    return { id: stepDefinition.id, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to register step '${stepDefinition.id}': ${message}`);
    return { error: message, id: stepDefinition.id, success: false };
  }
};

export const registerWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  {
    adhocAttackDiscoveryDataClient,
    analytics,
    connectorTimeout,
    getEventLogIndex,
    getEventLogger,
    getStartServices,
    langSmithApiKey,
    langSmithProject,
    logger,
    workflowsManagementApi,
  }: {
    adhocAttackDiscoveryDataClient: IRuleDataClient;
    analytics?: AnalyticsServiceSetup;
    connectorTimeout: number;
    getEventLogIndex: () => Promise<string>;
    getEventLogger: () => Promise<IEventLogger>;
    getStartServices: () => Promise<{
      coreStart: CoreStart;
      pluginsStart: DiscoveriesPluginStartDeps;
    }>;
    langSmithApiKey?: string;
    langSmithProject?: string;
    logger: Logger;
    workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
  }
): StepRegistrationResult => {
  const defaultAlertRetrievalStepDef = withWorkflowsEnabledGuard(
    getDefaultAlertRetrievalStepDefinition({
      getEventLogIndex,
      getEventLogger,
      getStartServices,
      logger,
    }),
    getStartServices
  );
  logger.debug(
    () =>
      `Registering defaultAlertRetrievalStepDefinition with id: ${defaultAlertRetrievalStepDef.id}`
  );
  const defaultAlertRetrievalOutcome = tryRegisterStep({
    getStartServices,
    logger,
    stepDefinition: defaultAlertRetrievalStepDef,
    workflowsExtensions,
  });

  const defaultValidationStepDef = withWorkflowsEnabledGuard(
    getDefaultValidationStepDefinition({
      getStartServices,
      logger,
    }),
    getStartServices
  );
  logger.debug(
    () => `Registering defaultValidationStepDefinition with id: ${defaultValidationStepDef.id}`
  );
  const defaultValidationOutcome = tryRegisterStep({
    getStartServices,
    logger,
    stepDefinition: defaultValidationStepDef,
    workflowsExtensions,
  });

  const persistDiscoveriesStepDef = withWorkflowsEnabledGuard(
    getPersistDiscoveriesStepDefinition({
      adhocAttackDiscoveryDataClient,
      getStartServices,
      logger,
    }),
    getStartServices
  );
  logger.debug(
    () => `Registering persistDiscoveriesStepDefinition with id: ${persistDiscoveriesStepDef.id}`
  );
  const persistDiscoveriesOutcome = tryRegisterStep({
    getStartServices,
    logger,
    stepDefinition: persistDiscoveriesStepDef,
    workflowsExtensions,
  });

  const generateStepDef = withWorkflowsEnabledGuard(
    getGenerateStepDefinition({
      connectorTimeout,
      getEventLogIndex,
      getEventLogger,
      getStartServices,
      langSmithApiKey,
      langSmithProject,
      logger,
    }),
    getStartServices
  );
  logger.debug(() => `Registering generateStepDefinition with id: ${generateStepDef.id}`);
  const generateOutcome = tryRegisterStep({
    getStartServices,
    logger,
    stepDefinition: generateStepDef,
    workflowsExtensions,
  });

  const runStepDef = withWorkflowsEnabledGuard(
    getRunStepDefinition({
      analytics,
      getEventLogIndex,
      getEventLogger,
      getStartServices,
      logger,
      workflowsManagementApi,
    }),
    getStartServices
  );
  logger.debug(() => `Registering runStepDefinition with id: ${runStepDef.id}`);
  const runOutcome = tryRegisterStep({
    getStartServices,
    logger,
    stepDefinition: runStepDef,
    workflowsExtensions,
  });

  const outcomes = [
    defaultAlertRetrievalOutcome,
    defaultValidationOutcome,
    generateOutcome,
    persistDiscoveriesOutcome,
    runOutcome,
  ];

  const registeredSteps = outcomes
    .filter((o): o is { id: string; success: true } => o.success)
    .map((o) => o.id);

  const failedSteps = outcomes
    .filter((o): o is { error: string; id: string; success: false } => !o.success)
    .map((o) => ({ error: o.error, id: o.id }));

  if (failedSteps.length === 0) {
    logger.info('All workflow steps registered successfully');
  } else {
    logger.warn(
      `Workflow step registration completed with ${failedSteps.length} failure(s): ${failedSteps
        .map((s) => s.id)
        .join(', ')}`
    );
  }

  return { failedSteps, registeredSteps };
};
