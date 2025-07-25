/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';

/**
 * As internal user we check for existence of privilege monitoring resources.
 * and initialise it if it does not exist
 * @param context
 * @param logger
 */
export const checkAndInitPrivilegedMonitoringResources = async (
  context: SecuritySolutionRequestHandlerContext,
  logger: Logger
) => {
  const secSol = await context.securitySolution;
  const privMonDataClient = secSol.getPrivilegeMonitoringDataClient();

  await privMonDataClient.createIngestPipelineIfDoesNotExist();

  const doesIndexExist = await privMonDataClient.doesIndexExist();
  if (!doesIndexExist) {
    logger.info('Privilege monitoring index does not exist, initialising.');
    await privMonDataClient.createOrUpdateIndex().catch((e) => {
      if (e.meta.body.error.type === 'resource_already_exists_exception') {
        logger.info('Privilege monitoring index already exists');
      }
    });
    logger.info('Privilege monitoring resources installed');
  }
};
