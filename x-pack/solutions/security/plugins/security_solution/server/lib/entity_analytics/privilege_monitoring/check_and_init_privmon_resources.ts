/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import { createPrivmonIndexService } from './engine/elasticsearch/indices';

/**
 * As internal user we check for existence of privilege monitoring resources
 * and initialise it if it does not exist
 * @param context
 * @param logger
 */
export const checkAndInitPrivilegeMonitoringResources = async (
  context: SecuritySolutionRequestHandlerContext,
  logger: Logger
) => {
  const securityContext = await context.securitySolution;
  const privilegeMonitoringDataClient = securityContext.getPrivilegeMonitoringDataClient();
  const privmonIndexService = createPrivmonIndexService(privilegeMonitoringDataClient);
  await checkandInitPrivilegeMonitoringResourcesNoContext(privmonIndexService, logger);
};

export const checkandInitPrivilegeMonitoringResourcesNoContext = async (
  privmonIndexService: ReturnType<typeof createPrivmonIndexService>,
  logger: Logger
) => {
  const doesIndexExist = await privmonIndexService.doesIndexExist();
  if (!doesIndexExist) {
    logger.info('Privilege monitoring resources are not installed, initialising...');
    await privmonIndexService.initialisePrivmonIndex();
    logger.info('Privilege monitoring resources installed');
  }
};
