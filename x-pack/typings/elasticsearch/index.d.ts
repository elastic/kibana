/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { estypes } from '@elastic/elasticsearch';
import { InferSearchResponseOf, AggregateOf as AggregationResultOf } from './search';

export type ESFilter = estypes.QueryContainer;
export type ESSearchRequest = estypes.SearchRequest;
export type AggregationOptionsByType = Required<estypes.AggregationContainer>;
export type ESSearchHit<TDocument = unknown> = SearchHit<TDocument>;

export type ESSearchResponse<
  TDocument = unknown,
  TSearchRequest extends ESSearchRequest = ESSearchRequest,
  TOptions extends { restTotalHitsAsInt: boolean } = {}
> = InferSearchResponseOf<TDocument, TSearchRequest, TOptions>;

export { InferSearchResponseOf, AggregationResultOf };
