/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { CreateStoredScriptRequestBody } from '../../../../../common/api/entity_analytics/risk_score';

export const createStoredScript = async ({
  esClient,
  logger,
  options,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  options: CreateStoredScriptRequestBody;
}) => {
  try {
    await esClient.putScript(options);
    return { [options.id]: { success: true, error: null } };
  } catch (error) {
    const createScriptError = transformError(error);
    logger.error(`Failed to create stored script: ${options.id}: ${createScriptError.message}`);
    return { [options.id]: { success: false, error: createScriptError } };
  }
};
