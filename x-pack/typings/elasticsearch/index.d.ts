/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ValuesType } from 'utility-types';
import { Explanation, SearchParams, SearchResponse } from 'elasticsearch';
import { AggregationResponseMap, AggregationInputMap, SortOptions } from './aggregations';
export {
  AggregationInputMap,
  AggregationOptionsByType,
  AggregationResponseMap,
  AggregationResultOf,
  SortOptions,
  ValidAggregationKeysOf,
} from './aggregations';

// Typings for Elasticsearch queries and aggregations. These are intended to be
// moved to the Elasticsearch JS client at some point (see #77720.)

export type MaybeReadonlyArray<T> = T[] | readonly T[];

interface CollapseQuery {
  field: string;
  inner_hits: {
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
  _source?: ESSourceOptions;
}

export type ESSearchRequest = Omit<SearchParams, 'body'> & {
  body?: ESSearchBody;
};

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
  TDocument,
  TSearchRequest extends ESSearchRequest,
  TOptions extends ESSearchOptions = { restTotalHitsAsInt: false }
> = Omit<SearchResponse<TDocument>, 'aggregations' | 'hits'> &
  (TSearchRequest extends { body: { aggs: AggregationInputMap } }
    ? {
        aggregations?: AggregationResponseMap<TSearchRequest['body']['aggs'], TDocument>;
      }
    : {}) & {
    hits: Omit<SearchResponse<TDocument>['hits'], 'total' | 'hits'> &
      (TOptions['restTotalHitsAsInt'] extends true
        ? {
            total: number;
          }
        : {
            total: {
              value: number;
              relation: 'eq' | 'gte';
            };
          }) & { hits: ESHitsOf<TSearchRequest['body'], TDocument> };
  };

export interface ESFilter {
  [key: string]: {
    [key: string]: string | string[] | number | boolean | Record<string, unknown> | ESFilter[];
  };
}
