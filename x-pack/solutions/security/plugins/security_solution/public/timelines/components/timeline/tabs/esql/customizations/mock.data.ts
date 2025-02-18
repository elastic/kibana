/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrushTriggerEvent } from '@kbn/charts-plugin/public';
import type { ClickTriggerEventData } from './use_histogram_customizations';

export const mockOnMultiValueFilterCallbackEventData = {
  data: [
    {
      cells: [
        {
          row: 0,
          column: 0,
        },
      ],
      relation: 'OR',
      table: {
        type: 'datatable',
        columns: [
          {
            id: 'breakdown_column',
            name: 'Top 3 values of event.module',
            meta: {
              type: 'string',
              field: 'event.module',
              index:
                '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
              params: {
                id: 'terms',
                params: {
                  id: 'string',
                  otherBucketLabel: 'Other',
                  missingBucketLabel: '(missing value)',
                },
              },
              source: 'esaggs',
              sourceParams: {
                hasPrecisionError: false,
                indexPatternId: 'security-solution-default',
                id: '0',
                enabled: true,
                type: 'terms',
                params: {
                  field: 'event.module',
                  orderBy: '2',
                  order: 'desc',
                  size: 3,
                  otherBucket: true,
                  otherBucketLabel: 'Other',
                  missingBucket: false,
                  missingBucketLabel: '(missing value)',
                  includeIsRegex: false,
                  excludeIsRegex: false,
                },
                schema: 'segment',
              },
            },
          },
          {
            id: 'date_column',
            name: '@timestamp per 30 seconds',
            meta: {
              type: 'date',
              field: '@timestamp',
              index:
                '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
              params: {
                id: 'date',
                params: {
                  pattern: 'HH:mm:ss',
                },
              },
              source: 'esaggs',
              sourceParams: {
                hasPrecisionError: false,
                indexPatternId: 'security-solution-default',
                appliedTimeRange: {
                  from: '2023-08-17T09:25:24.869Z',
                  to: '2023-08-17T09:40:24.869Z',
                },
                id: '1',
                enabled: true,
                type: 'date_histogram',
                params: {
                  field: '@timestamp',
                  timeRange: {
                    from: '2023-08-17T09:25:24.869Z',
                    to: '2023-08-17T09:40:24.869Z',
                  },
                  useNormalizedEsInterval: true,
                  extendToTimeRange: false,
                  scaleMetricValues: false,
                  interval: 'auto',
                  used_interval: '30s',
                  drop_partials: false,
                  min_doc_count: 1,
                  extended_bounds: {},
                },
                schema: 'segment',
              },
            },
          },
          {
            id: 'count_column',
            name: 'Count of records',
            meta: {
              type: 'number',
              index:
                '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
              params: {
                id: 'number',
                params: {
                  pattern: '0,0',
                  formatOverride: true,
                },
              },
              source: 'esaggs',
              sourceParams: {
                hasPrecisionError: false,
                indexPatternId: 'security-solution-default',
                id: '2',
                enabled: true,
                type: 'count',
                params: {
                  emptyAsNull: false,
                },
                schema: 'metric',
              },
            },
          },
        ],
        rows: [
          {
            breakdown_column: 'endpoint',
            date_column: 1692264810000,
            count_column: 2,
          },
        ],
        meta: {
          type: 'esaggs',
          source: 'security-solution-default',
          statistics: {
            totalCount: 2,
          },
        },
      },
    },
  ],
};

export const mockOnSingleValueFilterCallbackEventData: { data: ClickTriggerEventData['data'] } = {
  data: [
    {
      row: 0,
      column: 1,
      table: {
        columns: [
          {
            id: 'breakdown_column',
            name: 'Top 3 values of event.module',
            meta: {
              type: 'string',
              field: 'event.module',
              index:
                '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
              params: {
                id: 'terms',
                params: {
                  id: 'string',
                  otherBucketLabel: 'Other',
                  missingBucketLabel: '(missing value)',
                },
              },
              source: 'esaggs',
              sourceParams: {
                hasPrecisionError: false,
                indexPatternId: 'security-solution-default',
                id: '0',
                enabled: true,
                type: 'terms',
                params: {
                  field: 'event.module',
                  orderBy: '2',
                  order: 'desc',
                  size: 3,
                  otherBucket: true,
                  otherBucketLabel: 'Other',
                  missingBucket: false,
                  missingBucketLabel: '(missing value)',
                  includeIsRegex: false,
                  excludeIsRegex: false,
                },
                schema: 'segment',
              },
            },
          },
          {
            id: 'date_column',
            name: '@timestamp per 30 seconds',
            meta: {
              type: 'date',
              field: '@timestamp',
              index:
                '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
              params: {
                id: 'date',
                params: {
                  pattern: 'HH:mm:ss',
                },
              },
              source: 'esaggs',
              sourceParams: {
                hasPrecisionError: false,
                indexPatternId: 'security-solution-default',
                appliedTimeRange: {
                  from: '2023-08-17T09:25:24.869Z',
                  to: '2023-08-17T09:40:24.869Z',
                },
                id: '1',
                enabled: true,
                type: 'date_histogram',
                params: {
                  field: '@timestamp',
                  timeRange: {
                    from: '2023-08-17T09:25:24.869Z',
                    to: '2023-08-17T09:40:24.869Z',
                  },
                  useNormalizedEsInterval: true,
                  extendToTimeRange: false,
                  scaleMetricValues: false,
                  interval: 'auto',
                  used_interval: '30s',
                  drop_partials: false,
                  min_doc_count: 1,
                  extended_bounds: {},
                },
                schema: 'segment',
              },
            },
          },
          {
            id: 'count_column',
            name: 'Count of records',
            meta: {
              type: 'number',
              index:
                '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
              params: {
                id: 'number',
                params: {
                  pattern: '0,0',
                  formatOverride: true,
                },
              },
              source: 'esaggs',
              sourceParams: {
                hasPrecisionError: false,
                indexPatternId: 'security-solution-default',
                id: '2',
                enabled: true,
                type: 'count',
                params: {
                  emptyAsNull: false,
                },
                schema: 'metric',
              },
            },
          },
        ],
        rows: [
          {
            breakdown_column: 'endpoint',
            date_column: 1692264810000,
            count_column: 2,
          },
        ],
      },
      value: 1692264810000,
    },
    {
      row: 0,
      column: 0,
      value: 'endpoint',
      table: {
        columns: [
          {
            id: 'breakdown_column',
            name: 'Top 3 values of event.module',
            meta: {
              type: 'string',
              field: 'event.module',
              index:
                '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
              params: {
                id: 'terms',
                params: {
                  id: 'string',
                  otherBucketLabel: 'Other',
                  missingBucketLabel: '(missing value)',
                },
              },
              source: 'esaggs',
              sourceParams: {
                hasPrecisionError: false,
                indexPatternId: 'security-solution-default',
                id: '0',
                enabled: true,
                type: 'terms',
                params: {
                  field: 'event.module',
                  orderBy: '2',
                  order: 'desc',
                  size: 3,
                  otherBucket: true,
                  otherBucketLabel: 'Other',
                  missingBucket: false,
                  missingBucketLabel: '(missing value)',
                  includeIsRegex: false,
                  excludeIsRegex: false,
                },
                schema: 'segment',
              },
            },
          },
          {
            id: 'date_column',
            name: '@timestamp per 30 seconds',
            meta: {
              type: 'date',
              field: '@timestamp',
              index:
                '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
              params: {
                id: 'date',
                params: {
                  pattern: 'HH:mm:ss',
                },
              },
              source: 'esaggs',
              sourceParams: {
                hasPrecisionError: false,
                indexPatternId: 'security-solution-default',
                appliedTimeRange: {
                  from: '2023-08-17T09:25:24.869Z',
                  to: '2023-08-17T09:40:24.869Z',
                },
                id: '1',
                enabled: true,
                type: 'date_histogram',
                params: {
                  field: '@timestamp',
                  timeRange: {
                    from: '2023-08-17T09:25:24.869Z',
                    to: '2023-08-17T09:40:24.869Z',
                  },
                  useNormalizedEsInterval: true,
                  extendToTimeRange: false,
                  scaleMetricValues: false,
                  interval: 'auto',
                  used_interval: '30s',
                  drop_partials: false,
                  min_doc_count: 1,
                  extended_bounds: {},
                },
                schema: 'segment',
              },
            },
          },
          {
            id: 'count_column',
            name: 'Count of records',
            meta: {
              type: 'number',
              index:
                '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
              params: {
                id: 'number',
                params: {
                  pattern: '0,0',
                  formatOverride: true,
                },
              },
              source: 'esaggs',
              sourceParams: {
                hasPrecisionError: false,
                indexPatternId: 'security-solution-default',
                id: '2',
                enabled: true,
                type: 'count',
                params: {
                  emptyAsNull: false,
                },
                schema: 'metric',
              },
            },
          },
        ],
        rows: [
          {
            breakdown_column: 'endpoint',
            date_column: 1692264810000,
            count_column: 2,
          },
        ],
      },
    },
  ],
};

export const mockBrushEndCallbackEventData: BrushTriggerEvent['data'] = {
  range: [1688279924909, 1692234058529],
  table: {
    type: 'datatable',
    columns: [
      {
        id: 'breakdown_column',
        name: 'Top 3 values of event.module',
        meta: {
          type: 'string',
          field: 'event.module',
          index:
            '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
          params: {
            id: 'terms',
            params: {
              id: 'string',
              otherBucketLabel: 'Other',
              missingBucketLabel: '(missing value)',
            },
          },
          source: 'esaggs',
          sourceParams: {
            hasPrecisionError: false,
            indexPatternId: 'security-solution-default',
            id: '0',
            enabled: true,
            type: 'terms',
            params: {
              field: 'event.module',
              orderBy: '2',
              order: 'desc',
              size: 3,
              otherBucket: true,
              otherBucketLabel: 'Other',
              missingBucket: false,
              missingBucketLabel: '(missing value)',
              includeIsRegex: false,
              excludeIsRegex: false,
            },
            schema: 'segment',
          },
        },
      },
      {
        id: 'date_column',
        name: '@timestamp per 7 days',
        meta: {
          type: 'date',
          field: '@timestamp',
          index:
            '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
          params: {
            id: 'date',
            params: {
              pattern: 'YYYY-MM-DD',
            },
          },
          source: 'esaggs',
          sourceParams: {
            hasPrecisionError: false,
            indexPatternId: 'security-solution-default',
            appliedTimeRange: {
              from: '2022-05-17T14:22:09.039Z',
              to: '2023-08-17T14:22:09.039Z',
            },
            id: '1',
            enabled: true,
            type: 'date_histogram',
            params: {
              field: '@timestamp',
              timeRange: {
                from: '2022-05-17T14:22:09.039Z',
                to: '2023-08-17T14:22:09.039Z',
              },
              useNormalizedEsInterval: true,
              extendToTimeRange: false,
              scaleMetricValues: false,
              interval: 'auto',
              used_interval: '1w',
              drop_partials: false,
              min_doc_count: 1,
              extended_bounds: {},
            },
            schema: 'segment',
          },
        },
      },
      {
        id: 'count_column',
        name: 'Count of records',
        meta: {
          type: 'number',
          index:
            '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
          params: {
            id: 'number',
            params: {
              pattern: '0,0',
              formatOverride: true,
            },
          },
          source: 'esaggs',
          sourceParams: {
            hasPrecisionError: false,
            indexPatternId: 'security-solution-default',
            id: '2',
            enabled: true,
            type: 'count',
            params: {
              emptyAsNull: false,
            },
            schema: 'metric',
          },
        },
      },
    ],
    rows: [
      {
        breakdown_column: 'endpoint',
        date_column: 1691964000000,
        count_column: 2,
      },
    ],
    meta: {
      type: 'esaggs',
      source: 'security-solution-default',
      statistics: {
        totalCount: 27,
      },
    },
  },
  column: 1,
};
