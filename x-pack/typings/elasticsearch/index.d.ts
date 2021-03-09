/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { estypes } from '@elastic/elasticsearch';
import { ValuesType } from 'utility-types';
import { Explanation, SearchParams, SearchResponse } from 'elasticsearch';
import { RequestParams } from '@elastic/elasticsearch';
import { InferSearchResponseOf, AggregateOf as AggregationResultOf } from './search';

export type ESFilter = estypes.QueryContainer;
export type ESSearchRequest = estypes.SearchRequest;
export type AggregationOptionsByType = Required<estypes.AggregationContainer>;
export type ESSearchHit<TDocument = unknown> = SearchHit<TDocument>;

// Typings for Elasticsearch queries and aggregations. These are intended to be
// moved to the Elasticsearch JS client at some point (see #77720.)

export type MaybeReadonlyArray<T> = T[] | readonly T[];

interface CollapseQuery {
  field: string;
  inner_hits?: {
    name: string;
    size?: number;
    sort?: SortOptions;
    _source?:
      | string
      | string[]
      | {
          includes?: string | string[];
          excludes?: string | string[];
        };
    collapse?: {
      field: string;
    };
  };
  max_concurrent_group_searches?: number;
}

export type ESSourceOptions = boolean | string | string[];

export type ESHitsOf<
  TOptions extends
    | {
        size?: number;
        _source?: ESSourceOptions;
        docvalue_fields?: MaybeReadonlyArray<string>;
        fields?: MaybeReadonlyArray<string>;
      }
    | undefined,
  TDocument extends unknown
> = Array<
  ESSearchHit<
    TOptions extends { _source: false } ? undefined : TDocument,
    TOptions extends { fields: MaybeReadonlyArray<string> } ? TOptions['fields'] : undefined,
    TOptions extends { docvalue_fields: MaybeReadonlyArray<string> }
      ? TOptions['docvalue_fields']
      : undefined
  >
>;

export interface ESSearchBody {
  query?: any;
  size?: number;
  from?: number;
  aggs?: AggregationInputMap;
  track_total_hits?: boolean | number;
  collapse?: CollapseQuery;
  search_after?: Array<string | number>;
  _source?: ESSourceOptions;
}

export type ESSearchRequest = RequestParams.Search<ESSearchBody>;

export interface ESSearchOptions {
  restTotalHitsAsInt: boolean;
}

export type ESSearchHit<
  TSource extends any = unknown,
  TFields extends MaybeReadonlyArray<string> | undefined = undefined,
  TDocValueFields extends MaybeReadonlyArray<string> | undefined = undefined
> = {
  _index: string;
  _type: string;
  _id: string;
  _score: number;
  _version?: number;
  _explanation?: Explanation;
  highlight?: any;
  inner_hits?: any;
  matched_queries?: string[];
  sort?: string[];
} & (TSource extends false ? {} : { _source: TSource }) &
  (TFields extends MaybeReadonlyArray<string>
    ? {
        fields: Partial<Record<ValuesType<TFields>, unknown[]>>;
      }
    : {}) &
  (TDocValueFields extends MaybeReadonlyArray<string>
    ? {
        fields: Partial<Record<ValuesType<TDocValueFields>, unknown[]>>;
      }
    : {});

export type ESSearchResponse<
  TDocument = unknown,
  TSearchRequest extends ESSearchRequest = ESSearchRequest,
  TOptions extends { restTotalHitsAsInt: boolean } = {}
> = InferSearchResponseOf<TDocument, TSearchRequest, TOptions>;

export { InferSearchResponseOf, AggregationResultOf };
