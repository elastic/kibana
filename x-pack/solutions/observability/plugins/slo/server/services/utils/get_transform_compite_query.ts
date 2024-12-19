/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsCompositeAggregationSource,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { createEsParams } from '../../utils/queries';

export function getTransformQueryComposite(transform: TransformPutTransformRequest['body']) {
  let transformQueryString: string = '';
  if (transform) {
    const pivotGroupBy = transform.pivot?.group_by ?? {};
    const transformQuery = createEsParams({
      body: {
        size: 0,
        query: transform.source.query,
        runtime_mappings: transform.source.runtime_mappings,
        aggs: {
          groupBy: {
            composite: {
              sources: Object.keys(pivotGroupBy).map((key) => ({
                [key]: pivotGroupBy[key] as AggregationsCompositeAggregationSource,
              })),
            },
            aggs: transform?.pivot?.aggregations,
          },
        },
      },
    });

    transformQueryString = `POST ${transform.source.index}/_search\n${JSON.stringify(
      transformQuery.body,
      null,
      2
    )}`;
  }

  return transformQueryString;
}
