/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory, IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import type { GetEvaluateResponse } from '@kbn/elastic-assistant-common';
import { buildResponse } from '../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../types';
import { performChecks } from '../helpers';
import { ASSISTANT_GRAPH_MAP } from '../../lib/langchain/graphs';
import { fetchLangSmithDatasets, getEvaluationResults } from './utils';

export const handler = async (
  context: ElasticAssistantRequestHandlerContext,
  request: KibanaRequest,
  response: KibanaResponseFactory
): Promise<IKibanaResponse<GetEvaluateResponse>> => {
  const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
  const assistantContext = ctx.elasticAssistant;
  const esClientInternalUser = ctx.core.elasticsearch.client.asInternalUser;
  const logger = assistantContext.logger.get('evaluate');

  // Perform license, authenticated user and evaluation FF checks
  const checkResponse = await performChecks({
    capability: 'assistantModelEvaluation',
    context: ctx,
    request,
    response,
  });

  if (!checkResponse.isSuccess) {
    return checkResponse.response;
  }

  const datasets = await fetchLangSmithDatasets({
    logger,
  });

  const results = await getEvaluationResults({ esClientInternalUser, logger });

  try {
    return response.ok({
      body: { graphs: Object.keys(ASSISTANT_GRAPH_MAP), datasets, results },
    });
  } catch (err) {
    logger.error(err);
    const error = transformError(err);

    const resp = buildResponse(response);
    return resp.error({
      body: { error: error.message },
      statusCode: error.statusCode,
    });
  }
};
