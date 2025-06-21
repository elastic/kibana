/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { ExceptionMetricsSchema } from './types';

export const exceptionsMetricsSchema: MakeSchemaFrom<ExceptionMetricsSchema> = {
  items_overview: {
    total: {
      type: 'long',
      _meta: {
        description: 'Total number of exception items',
      },
    },
    has_expire_time: {
      type: 'long',
      _meta: {
        description: 'Total number of exception items using expired time property',
      },
    },
    are_expired: {
      type: 'long',
      _meta: {
        description: 'Total number of expired exception items',
      },
    },
    has_comments: {
      type: 'long',
      _meta: {
        description: 'Total number of exception items that have comments',
      },
    },
    entries: {
      match: {
        type: 'long',
        _meta: {
          description: 'Total number of exception items that have match entries',
        },
      },
      list: {
        type: 'long',
        _meta: {
          description: 'Total number of exception items that have match entries',
        },
      },
      nested: {
        type: 'long',
        _meta: {
          description: 'Total number of exception items that have nested entries',
        },
      },
      match_any: {
        type: 'long',
        _meta: {
          description: 'Total number of exception items that have match_any entries',
        },
      },
      exists: {
        type: 'long',
        _meta: {
          description: 'Total number of exception items that have exists entries',
        },
      },
      wildcard: {
        type: 'long',
        _meta: {
          description: 'Total number of exception items that have wildcard entries',
        },
      },
    },
  },
  lists_overview: {
    detection: {
      lists: {
        type: 'long',
        _meta: {
          description: 'Total number of exception lists of type "detection"',
        },
      },
      total_items: {
        type: 'long',
        _meta: {
          description: 'Total number of exception list items of type "detection"',
        },
      },
      max_items_per_list: {
        type: 'long',
        _meta: {
          description: 'Largest exception list of type "detection" - number of items',
        },
      },
      min_items_per_list: {
        type: 'long',
        _meta: {
          description: 'Smallest exception list of type "detection" - number of items',
        },
      },
      median_items_per_list: {
        type: 'long',
        _meta: {
          description: 'Average number of exception list items per list of type "detection"',
        },
      },
    },
    rule_default: {
      lists: {
        type: 'long',
        _meta: {
          description: 'Total number of exception lists of type "rule_default"',
        },
      },
      total_items: {
        type: 'long',
        _meta: {
          description: 'Total number of exception list items of type "rule_default"',
        },
      },
      max_items_per_list: {
        type: 'long',
        _meta: {
          description: 'Largest exception list of type "rule_default"- number of items',
        },
      },
      min_items_per_list: {
        type: 'long',
        _meta: {
          description: 'Smallest exception list of type "rule_default"- number of items',
        },
      },
      median_items_per_list: {
        type: 'long',
        _meta: {
          description: 'Average number of exception list items per list of type "rule_default"',
        },
      },
    },
    endpoint: {
      lists: {
        type: 'long',
        _meta: {
          description: 'Total number of exception lists of type "endpoint"',
        },
      },
      total_items: {
        type: 'long',
        _meta: {
          description: 'Total number of exception list items of type "endpoint"',
        },
      },
      max_items_per_list: {
        type: 'long',
        _meta: {
          description: 'Largest exception list of type "endpoint"- number of items',
        },
      },
      min_items_per_list: {
        type: 'long',
        _meta: {
          description: 'Smallest exception list of type "endpoint"- number of items',
        },
      },
      median_items_per_list: {
        type: 'long',
        _meta: {
          description: 'Average number of exception list items per list of type "endpoint"',
        },
      },
    },
  },
};
