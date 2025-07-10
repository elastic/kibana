/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { EventLogStatusMetric } from '../types';

export const ruleStatusMetricsSchema: MakeSchemaFrom<EventLogStatusMetric> = {
  all_rules: {
    eql: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration of time spent indexing alerts' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration of time spent indexing alerts' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration of time spent indexing alerts' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration of time spent searching alerts' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration of time spent searching alerts' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration of time spent searching alerts' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration of time spent enriching alerts' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration of time spent enriching alerts' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration of time spent enriching alerts' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    new_terms: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    esql: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    threat_match: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    machine_learning: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    query: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    saved_query: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    threshold: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    total: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of succeeded rules' },
      },
    },
  },
  elastic_rules: {
    eql: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    new_terms: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    esql: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    threat_match: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    machine_learning: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    query: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    saved_query: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    threshold: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    total: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of succeeded rules' },
      },
    },
  },
  custom_rules: {
    eql: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    new_terms: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    esql: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    threat_match: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    machine_learning: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    query: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    saved_query: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    threshold: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      top_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      top_partial_failures: {
        type: 'array',
        items: {
          message: {
            type: 'keyword',
            _meta: { description: 'Failed rule message' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Number of times the message occurred' },
          },
        },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of successful rules' },
      },
      index_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      search_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      enrichment_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_duration: {
        max: {
          type: 'float',
          _meta: { description: 'The max duration' },
        },
        avg: {
          type: 'float',
          _meta: { description: 'The avg duration' },
        },
        min: {
          type: 'float',
          _meta: { description: 'The min duration' },
        },
      },
      gap_count: {
        type: 'long',
        _meta: { description: 'The count of gaps' },
      },
    },
    total: {
      failures: {
        type: 'long',
        _meta: { description: 'The number of failed rules' },
      },
      partial_failures: {
        type: 'long',
        _meta: { description: 'The number of partial failure rules' },
      },
      succeeded: {
        type: 'long',
        _meta: { description: 'The number of succeeded rules' },
      },
    },
  },
};
