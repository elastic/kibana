/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ValueListsOverviewMetricsSchema {
  total: number;
  binary: number;
  boolean: number;
  byte: number;
  date: number;
  date_nanos: number;
  date_range: number;
  double: number;
  double_range: number;
  float: number;
  float_range: number;
  geo_point: number;
  geo_shape: number;
  half_float: number;
  integer: number;
  integer_range: number;
  ip: number;
  ip_range: number;
  keyword: number;
  long: number;
  long_range: number;
  shape: number;
  short: number;
  text: number;
}

export interface ValueListItemsOverviewMetricsSchema {
  total: number;
  max_items_per_list: number;
  min_items_per_list: number;
  median_items_per_list: number;
}

export interface ValueListMetricsSchema {
  lists_overview: ValueListsOverviewMetricsSchema;
  items_overview: ValueListItemsOverviewMetricsSchema;
}

export interface ListsOverviewAggsResponse {
  hits: {
    total: {
      value: number;
    };
  };
  aggregations: {
    by_type: {
      buckets: Array<{
        key: string;
        doc_count: number;
      }>;
    };
  };
}

export interface ListItemsOverviewAggsResponse {
  hits: {
    total: {
      value: number;
    };
  };
  aggregations: {
    min_items_per_list: {
      value: number;
      keys: string[];
    };
    max_items_per_list: {
      value: number;
      keys: string[];
    };
    median_items_per_list: {
      values: {
        '50.0': number;
      };
    };
  };
}
