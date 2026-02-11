/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  Indices,
  MappingRuntimeFields,
  Sort,
} from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import type { SecuritySolutionRequestHandlerContext } from '../../../../types';
import type { QueryAlertsBodyParams } from '../../../../../common/api/detection_engine/signals';
import { buildSiemResponse } from '../utils';

interface SearchAlertsProps {
  context: SecuritySolutionRequestHandlerContext;
  request: KibanaRequest<unknown, unknown, QueryAlertsBodyParams>;
  response: KibanaResponseFactory;
  getIndexPattern: () => Promise<undefined | Indices>;
}

export const searchAlertsHandler = async ({
  context,
  request,
  response,
  getIndexPattern,
}: SearchAlertsProps) => {
  const esClient = (await context.core).elasticsearch.client.asCurrentUser;

  const {
    query,
    aggs,
    _source,
    fields,
    track_total_hits: trackTotalHits,
    size,
    runtime_mappings: runtimeMappings,
    sort,
  } = request.body;
  const siemResponse = buildSiemResponse(response);

  if (
    query == null &&
    aggs == null &&
    _source == null &&
    fields == null &&
    trackTotalHits == null &&
    size == null &&
    sort == null
  ) {
    return siemResponse.error({
      statusCode: 400,
      body: '"value" must have at least 1 children',
    });
  }
  try {
    const indexPattern = await getIndexPattern();

    const result = await esClient.search({
      index: indexPattern,
      query,
      aggs: aggs as Record<string, AggregationsAggregationContainer>,
      _source,
      fields,
      track_total_hits: trackTotalHits,
      size,
      runtime_mappings: runtimeMappings as MappingRuntimeFields,
      sort: sort as Sort,
      ignore_unavailable: true,
    });

    return response.ok({ body: result });
  } catch (err) {
    // error while getting or updating signal with id: id in signal index .siem-signals
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
