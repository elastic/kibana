/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { ValueListMetricsSchema } from './types';

export const valueListsMetricsSchema: MakeSchemaFrom<ValueListMetricsSchema> = {
  lists_overview: {
    total: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists',
      },
    },
    binary: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "binary"',
      },
    },
    boolean: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "boolean"',
      },
    },
    byte: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "byte"',
      },
    },
    date: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "date"',
      },
    },
    date_nanos: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "date_nanos"',
      },
    },
    date_range: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "date_range"',
      },
    },
    double: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "double"',
      },
    },
    double_range: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "double_range"',
      },
    },
    float: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "float"',
      },
    },
    float_range: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "float_range"',
      },
    },
    geo_point: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "geo_point"',
      },
    },
    geo_shape: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "geo_shape"',
      },
    },
    half_float: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "half_float"',
      },
    },
    integer: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "integer"',
      },
    },
    integer_range: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "integer_range"',
      },
    },
    ip: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "ip"',
      },
    },
    ip_range: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "ip_range"',
      },
    },
    keyword: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "keyword"',
      },
    },
    long: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "long"',
      },
    },
    long_range: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "long_range"',
      },
    },
    shape: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "shape"',
      },
    },
    short: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "short"',
      },
    },
    text: {
      type: 'long',
      _meta: {
        description: 'Total number of value lists of type "text"',
      },
    },
  },
  items_overview: {
    total: {
      type: 'long',
      _meta: {
        description: 'Total number of value list items',
      },
    },
    max_items_per_list: {
      type: 'long',
      _meta: {
        description: 'Max number of value list items in a single list',
      },
    },
    min_items_per_list: {
      type: 'long',
      _meta: {
        description: 'Min number of value list items in a single list',
      },
    },
    median_items_per_list: {
      type: 'long',
      _meta: {
        description: 'Median number of value list items in a single list',
      },
    },
  },
};
