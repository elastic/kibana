/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FromSchema } from 'json-schema-to-ts';
import { ChangePointType } from '@kbn/es-types/src';

export const changesFunctionParameters = {
  type: 'object',
  properties: {
    start: {
      type: 'string',
      description:
        'The beginning of the time range, in datemath, like now-24h, or an ISO timestamp',
    },
    end: {
      type: 'string',
      description: 'The end of the time range, in datemath, like now, or an ISO timestamp',
    },
    logs: {
      description:
        'Analyze changes in log patterns. If no index is given, the default logs index pattern will be used',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of this set of logs',
          },
          index: {
            type: 'string',
            description: 'The index or index pattern where to find the logs',
          },
          kqlFilter: {
            type: 'string',
            description: 'A KQL filter to filter the log documents by, e.g. my_field:foo',
          },
          field: {
            type: 'string',
            description:
              'The text field that contains the message to be analyzed, usually `message`. ONLY use field names from the conversation.',
          },
        },
        required: ['name'],
      },
    },
    metrics: {
      description:
        'Analyze changes in metrics. DO NOT UNDER ANY CIRCUMSTANCES use date or metric fields for groupBy, leave empty unless needed.',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of this set of metrics',
          },
          index: {
            type: 'string',
            description: 'The index or index pattern where to find the metrics',
          },
          kqlFilter: {
            type: 'string',
            description: 'A KQL filter to filter the log documents by, e.g. my_field:foo',
          },
          field: {
            type: 'string',
            description:
              'Metric field that contains the metric. Only use if the metric aggregation type is not count.',
          },
          type: {
            type: 'string',
            description: 'The type of metric aggregation to perform. Defaults to count',
            enum: ['count', 'avg', 'sum', 'min', 'max', 'p95', 'p99'],
          },
          groupBy: {
            type: 'array',
            description: 'Optional keyword fields to group metrics by.',
            items: {
              type: 'string',
            },
          },
        },
        required: ['index', 'name'],
      },
    },
  },
  required: ['start', 'end'],
} as const;

interface Change {
  name: string;
  key: string;
  changes: {
    time?: string;
    type: ChangePointType;
    p_value?: number;
  };
}

type MetricChange = Change;

interface LogChange extends Change {
  pattern: string;
}

export interface LogChangeWithTimeseries extends LogChange {
  over_time: Array<{ x: number; y: number | null }>;
}

export interface MetricChangeWithTimeseries extends MetricChange {
  over_time: Array<{ x: number; y: number | null }>;
}

export type ChangesArguments = FromSchema<typeof changesFunctionParameters>;

export interface ChangesFunctionResponse {
  content: {
    description: string;
    changes: {
      logs: LogChange[];
      metrics: MetricChange[];
    };
  };
  data: {
    changes: {
      logs: LogChangeWithTimeseries[];
      metrics: MetricChangeWithTimeseries[];
    };
  };
}
