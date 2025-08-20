/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import {
  AttachmentType,
  type SuggestionContext,
  type SuggestionHandlerResponse,
} from '@kbn/cases-plugin/common';
import type { SuggestionType } from '@kbn/cases-plugin/server';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { AttachmentItem } from '@kbn/cases-plugin/common/types/domain/suggestion/v1';
import { OverviewStatusMetaData } from '../../common/runtime_types';
import { SyntheticsSuggestion } from '../../common/types';
export interface SyntheticsAggregationsResponse {
  aggregations: {
    by_monitor: {
      doc_count_error_upper_bound: number;
      sum_other_doc_count: number;
      buckets: MonitorBucket[];
    };
  };
}

export interface MonitorBucket {
  key: string; // monitor name
  doc_count: number;
  latest_run: {
    hits: {
      total: {
        value: number;
        relation: string;
      };
      max_score: number | null;
      hits: Array<{
        _index: string;
        _id: string;
        _score: number | null;
        _source: SyntheticsMonitorSource;
        sort: number[];
      }>;
    };
  };
}

export interface SyntheticsMonitorSource {
  monitor: {
    name: string;
    type: string;
    id: string;
    status?: string;
  };
  url: {
    full: string;
  };
  observer: {
    geo: {
      name: string;
    };
    name: string;
  };
  '@timestamp': string;
  config_id: string;
  meta: {
    space_id: string[];
  };
}

export function getMonitorByServiceName(
  coreStart: CoreStart,
  logger: Logger
): SuggestionType<SyntheticsSuggestion> {
  return {
    id: 'SyntheticMonitorByServiceName',
    attachmentId: '.page',
    owner: 'observability',
    tools: {
      SyntheticMonitorByServiceName: {
        description: 'Suggest Synthetic monitors operating on the same service.',
        schema: {
          type: 'object',
          properties: {
            serviceName: {
              type: 'string',
              description: 'Name of the relevant service',
            },
          },
        },
      },
    },
    handlers: {
      SyntheticMonitorByServiceName: async ({
        context,
        request,
      }: {
        context: SuggestionContext;
        request: KibanaRequest;
      }): Promise<SuggestionHandlerResponse<SyntheticsSuggestion>> => {
        const serviceNames = 'service.name' in context ? context['service.name'] : [];
        if (!serviceNames.length) {
          return { suggestions: [] };
        }
        const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);

        const results = await scopedClusterClient.asCurrentUser.search({
          index: 'synthetics-*',
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    'service.name': serviceNames,
                  },
                },
              ],
            },
          },
          aggs: {
            by_monitor: {
              terms: {
                field: 'observer.name',
                // TODO: TBD
                // it limits suggestions to the top 5 monitors
                size: 5,
              },
              aggs: {
                latest_run: {
                  top_hits: {
                    sort: [
                      {
                        '@timestamp': {
                          order: 'desc',
                        },
                      },
                    ],
                    size: 1,
                    _source: {
                      includes: [
                        'monitor.name',
                        'monitor.type',
                        'monitor.status',
                        'status',
                        'observer.geo.name',
                        'observer.name',
                        'monitor.id',
                        'config_id',
                        'url.full',
                        '@timestamp',
                        'meta.space_id',
                        'type',
                      ],
                    },
                  },
                },
              },
            },
          },
        });
        // MetricItem

        const uniqueMonitor = (
          results.aggregations as SyntheticsAggregationsResponse['aggregations']
        ).by_monitor.buckets;
        const rawMonitorsData: Array<OverviewStatusMetaData> = uniqueMonitor.map((monitor) => {
          const source = monitor.latest_run.hits.hits[0]._source;
          return {
            monitorQueryId: source.monitor.id,
            configId: source.config_id,
            status: source.monitor.status ?? 'unknown',
            name: source.monitor.name,
            isEnabled: true,
            isStatusAlertEnabled: true,
            type: source.monitor.type,
            schedule: '1',
            tags: [],
            maintenanceWindows: [],
            timestamp: source['@timestamp'],
            spaces: source.meta.space_id,
            locationLabel: source.observer.geo.name,
            locationId: source.observer.name,
            updated_at: '2025-08-19T07:44:35.940Z',
            urls: source.url.full,
            projectId: '',
          };
        });
        const data = rawMonitorsData.map((monitor) => {
          return {
            id: 'synthetics-monitors-suggestion-' + monitor.monitorQueryId,
            description: 'Synthetic monitors that may be related to this case',
            payload: monitor,
            attachment: {
              type: AttachmentType.persistableState,
              persistableStateAttachmentTypeId: '.page',
              persistableStateAttachmentState: {
                type: 'synthetics_history',
                url: {
                  pathAndQuery: '<SOME_PATH_AND_QUERY>',
                  label: 'payload.name',
                  actionLabel: i18n.translate('xpack.synthetics.addToCase.caseAttachmentLabel', {
                    defaultMessage: 'Go to Synthetics history',
                  }),
                  iconType: 'metricbeatApp',
                },
              },
            },
          } as unknown as AttachmentItem<SyntheticsSuggestion>;
        });

        const suggestions = [
          {
            id: 'synthetics',
            description: `synthetic monitors linked to service`,
            data,
          },
        ];
        return { suggestions };
      },
    },
  };
}
