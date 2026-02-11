/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../types';

export async function getApmIndices({
  core,
  plugins,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}): Promise<APMIndices> {
  const [coreStart] = await core.getStartServices();
  const savedObjectsClient = new SavedObjectsClient(
    coreStart.savedObjects.createInternalRepository()
  );

  try {
    return plugins.apmDataAccess.getApmIndices(savedObjectsClient);
  } catch (error) {
    logger.warn(`Failed to resolve APM indices for Observability Agent: ${error.message}`);
    return {
      error: 'apm-error-*',
      metric: 'apm-metric-*',
      onboarding: 'apm-onboarding-*',
      span: 'apm-span-*',
      transaction: 'apm-transaction-*',
      sourcemap: 'apm-sourcemap-*',
    };
  }
}
