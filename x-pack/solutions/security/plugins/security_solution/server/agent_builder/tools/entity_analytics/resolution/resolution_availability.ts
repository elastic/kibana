/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolAvailabilityResult } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { getEntityAnalyticsToolAvailability } from '../entity_analytics_availability';

/**
 * Shared availability gate for entity-resolution Agent Builder tools
 */
export const getResolutionToolAvailability = async ({
  core,
  request,
  spaceId,
  experimentalFeatures,
  logger,
}: {
  core: SecuritySolutionPluginCoreSetupDependencies;
  request: KibanaRequest;
  spaceId: string;
  experimentalFeatures: ExperimentalFeatures;
  logger: Logger;
}): Promise<ToolAvailabilityResult> =>
  getEntityAnalyticsToolAvailability({
    core,
    request,
    spaceId,
    experimentalFeatures,
    logger,
    minLicense: 'enterprise',
  });
