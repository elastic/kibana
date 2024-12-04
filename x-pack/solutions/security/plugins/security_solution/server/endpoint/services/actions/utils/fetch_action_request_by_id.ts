/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { NotFoundError } from '../../../errors';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../common/endpoint/constants';
import type {
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
  LogsEndpointAction,
} from '../../../../../common/endpoint/types';
import { catchAndWrapError } from '../../../utils';

/**
 * Fetches a single Action request document.
 * @param esClient
 * @param actionId
 *
 * @throws
 */
export const fetchActionRequestById = async <
  TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
  TMeta extends {} = {}
>(
  esClient: ElasticsearchClient,
  actionId: string
): Promise<LogsEndpointAction<TParameters, TOutputContent, TMeta>> => {
  const searchResponse = await esClient
    .search<LogsEndpointAction<TParameters, TOutputContent, TMeta>>(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        query: { bool: { filter: [{ term: { action_id: actionId } }] } },
        size: 1,
      },
      { ignore: [404] }
    )
    .catch(catchAndWrapError);

  const actionRequest = searchResponse.hits.hits?.[0]?._source;

  if (!actionRequest) {
    throw new NotFoundError(`Action with id '${actionId}' not found.`);
  }

  return actionRequest;
};
