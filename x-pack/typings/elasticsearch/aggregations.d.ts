/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Unionize, UnionToIntersection } from 'utility-types';

type SortOrder = 'asc' | 'desc';
type SortInstruction = Record<string, SortOrder | { order: SortOrder }>;
export type SortOptions = SortOrder | SortInstruction | SortInstruction[];

type Script =
  | string
  | {
      lang?: string;
      id?: string;
      source?: string;
      params?: Record<string, string | number>;
    };

type BucketsPath = string | Record<string, string>;

type SourceOptions = string | string[];

type AggregationSourceOptions =
  | {
      field: string;
      missing?: unknown;
    }
  | {
      script: Script;
    };

interface MetricsAggregationResponsePart {
  value: number | null;
}
interface DateHistogramBucket {
  doc_count: number;
  key: number;
  key_as_string: string;
}

type GetCompositeKeys<
  TAggregationOptionsMap extends AggregationOptionsMap
> = TAggregationOptionsMap extends {
  composite: { sources: Array<infer Source> };
}
  ? keyof Source
  : never;

type CompositeOptionsSource = Record<
  string,
  | {
      terms: ({ field: string } | { script: Script }) & {
        missing_bucket?: boolean;
      };
    }
  | undefined
>;

export interface AggregationOptionsByType {
  terms: {
    size?: number;
    order?: SortOptions;
    execution_hint?: 'map' | 'global_ordinals';
  } & AggregationSourceOptions;
  date_histogram: {
    format?: string;
    min_doc_count?: number;
    extended_bounds?: {
      min: number;
      max: number;
    };
  } & ({ calendar_interval: string } | { fixed_interval: string }) &
    AggregationSourceOptions;
  histogram: {
    interval: number;
    min_doc_count?: number;
    extended_bounds?: {
      min?: number | string;
      max?: number | string;
    };
  } & AggregationSourceOptions;
  avg: AggregationSourceOptions;
  max: AggregationSourceOptions;
  min: AggregationSourceOptions;
  sum: AggregationSourceOptions;
  value_count: AggregationSourceOptions;
  cardinality: AggregationSourceOptions & {
    precision_threshold?: number;
  };
  percentiles: {
    percents?: number[];
    hdr?: { number_of_significant_value_digits: number };
  } & AggregationSourceOptions;
  stats: {
    field: string;
  };
  extended_stats: {
    field: string;
  };
  top_hits: {
    from?: number;
    size?: number;
    sort?: SortOptions;
    _source?: SourceOptions;
  };
  filter: Record<string, any>;
  filters: {
    filters: Record<string, any> | any[];
  };
  sampler: {
    shard_size?: number;
  };
  derivative: {
    buckets_path: BucketsPath;
  };
  bucket_script: {
    buckets_path: BucketsPath;
    script?: Script;
  };
  composite: {
    size?: number;
    sources: CompositeOptionsSource[];
    after?: Record<string, string | number | null>;
  };
  diversified_sampler: {
    shard_size?: number;
    max_docs_per_value?: number;
  } & ({ script: Script } | { field: string }); // TODO use MetricsAggregationOptions if possible
  scripted_metric: {
    params?: Record<string, any>;
    init_script?: Script;
    map_script: Script;
    combine_script: Script;
    reduce_script: Script;
  };
  date_range: {
    format?: string;
    ranges: Array<
      | { from: string | number }
      | { to: string | number }
      | { from: string | number; to: string | number }
    >;
    keyed?: boolean;
  } & AggregationSourceOptions;
  range: {
    field: string;
    ranges: Array<
      | { key?: string; from: string | number }
      | { key?: string; to: string | number }
      | { key?: string; from: string | number; to: string | number }
    >;
    keyed?: boolean;
  };
  auto_date_histogram: {
    buckets: number;
  } & AggregationSourceOptions;
  percentile_ranks: {
    values: Array<string | number>;
    keyed?: boolean;
    hdr?: { number_of_significant_value_digits: number };
  } & AggregationSourceOptions;
  bucket_sort: {
    sort?: SortOptions;
    from?: number;
    size?: number;
  };
  significant_terms: {
    size?: number;
    field?: string;
    background_filter?: Record<string, any>;
  } & AggregationSourceOptions;
  bucket_selector: {
    buckets_path: {
      [x: string]: string;
    };
    script: string;
  };
}

type AggregationType = keyof AggregationOptionsByType;

type AggregationOptionsMap = Unionize<
  {
    [TAggregationType in AggregationType]: AggregationOptionsByType[TAggregationType];
  }
> & { aggs?: AggregationInputMap };

interface DateRangeBucket {
  key: string;
  to?: number;
  from?: number;
  to_as_string?: string;
  from_as_string?: string;
  doc_count: number;
}

export interface AggregationInputMap {
  [key: string]: AggregationOptionsMap;
}

type SubAggregationResponseOf<
  TAggregationInputMap extends AggregationInputMap | undefined,
  TDocument
> = TAggregationInputMap extends AggregationInputMap
  ? AggregationResponseMap<TAggregationInputMap, TDocument>
  : {};

interface AggregationResponsePart<TAggregationOptionsMap extends AggregationOptionsMap, TDocument> {
  terms: {
    buckets: Array<
      {
        doc_count: number;
        key: string | number;
      } & SubAggregationResponseOf<TAggregationOptionsMap['aggs'], TDocument>
    >;
    doc_count_error_upper_bound?: number;
    sum_other_doc_count?: number;
  };
  histogram: {
    buckets: Array<
      {
        doc_count: number;
        key: number;
      } & SubAggregationResponseOf<TAggregationOptionsMap['aggs'], TDocument>
    >;
  };
  date_histogram: {
    buckets: Array<
      DateHistogramBucket & SubAggregationResponseOf<TAggregationOptionsMap['aggs'], TDocument>
    >;
  };
  avg: MetricsAggregationResponsePart;
  sum: MetricsAggregationResponsePart;
  max: MetricsAggregationResponsePart;
  min: MetricsAggregationResponsePart;
  value_count: { value: number };
  cardinality: {
    value: number;
  };
  percentiles: {
    values: Record<string, number | null>;
  };
  stats: {
    count: number;
    min: number | null;
    max: number | null;
    avg: number | null;
    sum: number | null;
  };
  extended_stats: {
    count: number;
    min: number | null;
    max: number | null;
    avg: number | null;
    sum: number | null;
    sum_of_squares: number | null;
    variance: number | null;
    std_deviation: number | null;
    std_deviation_bounds: {
      upper: number | null;
      lower: number | null;
    };
  };
  top_hits: {
    hits: {
      total: {
        value: number;
        relation: 'eq' | 'gte';
      };
      max_score: number | null;
      hits: Array<{
        _source: TDocument;
      }>;
    };
  };
  filter: {
    doc_count: number;
  } & SubAggregationResponseOf<TAggregationOptionsMap['aggs'], TDocument>;
  filters: TAggregationOptionsMap extends { filters: { filters: any[] } }
    ? Array<
        { doc_count: number } & AggregationResponseMap<TAggregationOptionsMap['aggs'], TDocument>
      >
    : TAggregationOptionsMap extends {
        filters: {
          filters: Record<string, any>;
        };
      }
    ? {
        buckets: {
          [key in keyof TAggregationOptionsMap['filters']['filters']]: {
            doc_count: number;
          } & SubAggregationResponseOf<TAggregationOptionsMap['aggs'], TDocument>;
        };
      }
    : never;
  sampler: {
    doc_count: number;
  } & SubAggregationResponseOf<TAggregationOptionsMap['aggs'], TDocument>;
  derivative:
    | {
        value: number;
      }
    | undefined;
  bucket_script:
    | {
        value: number | null;
      }
    | undefined;
  composite: {
    after_key: {
      [key in GetCompositeKeys<TAggregationOptionsMap>]: TAggregationOptionsMap;
    };
    buckets: Array<
      {
        key: Record<GetCompositeKeys<TAggregationOptionsMap>, string | number>;
        doc_count: number;
      } & SubAggregationResponseOf<TAggregationOptionsMap['aggs'], TDocument>
    >;
  };
  diversified_sampler: {
    doc_count: number;
  } & AggregationResponseMap<TAggregationOptionsMap['aggs'], TDocument>;
  scripted_metric: {
    value: unknown;
  };
  date_range: {
    buckets: TAggregationOptionsMap extends { date_range: { keyed: true } }
      ? Record<string, DateRangeBucket>
      : { buckets: DateRangeBucket[] };
  };
  range: {
    buckets: TAggregationOptionsMap extends { range: { keyed: true } }
      ? Record<
          string,
          DateRangeBucket & SubAggregationResponseOf<TAggregationOptionsMap['aggs'], TDocument>
        >
      : Array<
          DateRangeBucket & SubAggregationResponseOf<TAggregationOptionsMap['aggs'], TDocument>
        >;
  };
  auto_date_histogram: {
    buckets: Array<
      DateHistogramBucket & AggregationResponseMap<TAggregationOptionsMap['aggs'], TDocument>
    >;
    interval: string;
  };

  percentile_ranks: {
    values: TAggregationOptionsMap extends {
      percentile_ranks: { keyed: false };
    }
      ? Array<{ key: number; value: number }>
      : Record<string, number>;
  };
  significant_terms: {
    doc_count: number;
    bg_count: number;
    buckets: Array<
      {
        score: number;
        bg_count: number;
        doc_count: number;
        key: string | number;
      } & SubAggregationResponseOf<TAggregationOptionsMap['aggs'], TDocument>
    >;
  };
  bucket_sort: undefined;
  bucket_selector: undefined;
}

// Type for debugging purposes. If you see an error in AggregationResponseMap
// similar to "cannot be used to index type", uncomment the type below and hover
// over it to see what aggregation response types are missing compared to the
// input map.

// type MissingAggregationResponseTypes = Exclude<
//   AggregationType,
//   keyof AggregationResponsePart<{}, unknown>
// >;

// ensures aggregations work with requests where aggregation options are a union type,
// e.g. { transaction_groups: { composite: any } | { terms: any } }.
// Union keys are not included in keyof. The type will fall back to keyof T if
// UnionToIntersection fails, which happens when there are conflicts between the union
// types, e.g. { foo: string; bar?: undefined } | { foo?: undefined; bar: string };
export type ValidAggregationKeysOf<
  T extends Record<string, any>
> = keyof (UnionToIntersection<T> extends never ? T : UnionToIntersection<T>);

export type AggregationResultOf<
  TAggregationOptionsMap extends AggregationOptionsMap,
  TDocument
> = AggregationResponsePart<TAggregationOptionsMap, TDocument>[AggregationType &
  ValidAggregationKeysOf<TAggregationOptionsMap>];

export type AggregationResponseMap<
  TAggregationInputMap extends AggregationInputMap | undefined,
  TDocument
> = TAggregationInputMap extends AggregationInputMap
  ? {
      [TName in keyof TAggregationInputMap]: AggregationResponsePart<
        TAggregationInputMap[TName],
        TDocument
      >[AggregationType & ValidAggregationKeysOf<TAggregationInputMap[TName]>];
    }
  : undefined;
