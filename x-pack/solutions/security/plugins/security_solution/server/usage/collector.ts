/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';

import type { CollectorDependencies, DashboardMetrics } from './types';
import { getDetectionsMetrics } from './detections/get_metrics';
import { getInternalSavedObjectsClient } from './get_internal_saved_objects_client';
import { getEndpointMetrics } from './endpoint/get_metrics';
import { getDashboardMetrics } from './dashboards/get_dashboards_metrics';
import { riskEngineMetricsSchema } from './risk_engine/schema';
import { getRiskEngineMetrics } from './risk_engine/get_risk_engine_metrics';
import { rulesMetricsSchema } from './detections/rules/schema';
import { getExceptionsMetrics } from './exceptions/get_metrics';
import { exceptionsMetricsSchema } from './exceptions/schema';
import { valueListsMetricsSchema } from './value_lists/schema';
import { getValueListsMetrics } from './value_lists/get_metrics';

export type RegisterCollector = (deps: CollectorDependencies) => void;

export interface UsageData {
  detectionMetrics: {};
  endpointMetrics: {};
  dashboardMetrics: DashboardMetrics;
  riskEngineMetrics: {};
  exceptionsMetrics: {};
  valueListsMetrics: {};
}

export const registerCollector: RegisterCollector = ({
  core,
  eventLogIndex,
  signalsIndex,
  ml,
  usageCollection,
  logger,
  riskEngineIndexPatterns,
  legacySignalsIndex,
}) => {
  if (!usageCollection) {
    logger.debug('Usage collection is undefined, therefore returning early without registering it');
    return;
  }

  // THIS IS A FAKE CHANGE TO TEST FLAKY TESTS IN THE PIPELINE
  const securitySolutionCollector = usageCollection.makeUsageCollector<UsageData>({
    type: 'security_solution',
    schema: {
      detectionMetrics: {
        detection_rules: rulesMetricsSchema,
        ml_jobs: {
          ml_job_usage: {
            custom: {
              enabled: {
                type: 'long',
                _meta: { description: 'The number of custom ML jobs rules enabled' },
              },
              disabled: {
                type: 'long',
                _meta: { description: 'The number of custom ML jobs rules disabled' },
              },
            },
            elastic: {
              enabled: {
                type: 'long',
                _meta: { description: 'The number of elastic provided ML jobs rules enabled' },
              },
              disabled: {
                type: 'long',
                _meta: { description: 'The number of elastic provided ML jobs rules disabled' },
              },
            },
          },
          ml_job_metrics: {
            type: 'array',
            items: {
              job_id: {
                type: 'keyword',
                _meta: { description: 'Identifier for the anomaly detection job' },
              },
              open_time: {
                type: 'keyword',
                _meta: {
                  description:
                    'For open jobs only, the elapsed time for which the job has been open',
                },
              },
              create_time: {
                type: 'keyword',
                _meta: { description: 'The time the job was created' },
              },
              finished_time: {
                type: 'keyword',
                _meta: {
                  description: 'If the job closed or failed, this is the time the job finished',
                },
              },
              state: {
                type: 'keyword',
                _meta: { description: 'The status of the anomaly detection job' },
              },
              data_counts: {
                bucket_count: {
                  type: 'long',
                  _meta: { description: 'The number of buckets processed' },
                },
                empty_bucket_count: {
                  type: 'long',
                  _meta: { description: 'The number of buckets which did not contain any data' },
                },
                input_bytes: {
                  type: 'long',
                  _meta: {
                    description:
                      'The number of bytes of input data posted to the anomaly detection job',
                  },
                },
                input_record_count: {
                  type: 'long',
                  _meta: {
                    description:
                      'The number of input documents posted to the anomaly detection job',
                  },
                },
                last_data_time: {
                  type: 'long',
                  _meta: {
                    description:
                      'The timestamp at which data was last analyzed, according to server time',
                  },
                },
                processed_record_count: {
                  type: 'long',
                  _meta: {
                    description:
                      'The number of input documents that have been processed by the anomaly detection job',
                  },
                },
              },
              model_size_stats: {
                bucket_allocation_failures_count: {
                  type: 'long',
                  _meta: {
                    description:
                      'The number of buckets for which new entities in incoming data were not processed due to insufficient model memory',
                  },
                },
                model_bytes: {
                  type: 'long',
                  _meta: { description: 'The number of bytes of memory used by the models' },
                },
                model_bytes_exceeded: {
                  type: 'long',
                  _meta: {
                    description:
                      'The number of bytes over the high limit for memory usage at the last allocation failure',
                  },
                },
                model_bytes_memory_limit: {
                  type: 'long',
                  _meta: {
                    description:
                      'The upper limit for model memory usage, checked on increasing values',
                  },
                },
                peak_model_bytes: {
                  type: 'long',
                  _meta: {
                    description: 'The peak number of bytes of memory ever used by the models',
                  },
                },
              },
              timing_stats: {
                bucket_count: {
                  type: 'long',
                  _meta: { description: 'The number of buckets processed' },
                },
                exponential_average_bucket_processing_time_ms: {
                  type: 'long',
                  _meta: {
                    description:
                      'Exponential moving average of all bucket processing times, in milliseconds',
                  },
                },
                exponential_average_bucket_processing_time_per_hour_ms: {
                  type: 'long',
                  _meta: {
                    description:
                      'Exponentially-weighted moving average of bucket processing times calculated in a 1 hour time window, in milliseconds',
                  },
                },
                maximum_bucket_processing_time_ms: {
                  type: 'long',
                  _meta: {
                    description: 'Maximum among all bucket processing times, in milliseconds',
                  },
                },
                minimum_bucket_processing_time_ms: {
                  type: 'long',
                  _meta: {
                    description: 'Minimum among all bucket processing times, in milliseconds',
                  },
                },
                total_bucket_processing_time_ms: {
                  type: 'long',
                  _meta: { description: 'Sum of all bucket processing times, in milliseconds' },
                },
              },
              datafeed: {
                datafeed_id: {
                  type: 'keyword',
                  _meta: {
                    description:
                      'A numerical character string that uniquely identifies the datafeed',
                  },
                },
                state: {
                  type: 'keyword',
                  _meta: { description: 'The status of the datafeed' },
                },
                timing_stats: {
                  average_search_time_per_bucket_ms: {
                    type: 'long',
                    _meta: { description: 'The average search time per bucket, in milliseconds' },
                  },
                  bucket_count: {
                    type: 'long',
                    _meta: { description: 'The number of buckets processed' },
                  },
                  exponential_average_search_time_per_hour_ms: {
                    type: 'long',
                    _meta: {
                      description: 'The exponential average search time per hour, in milliseconds',
                    },
                  },
                  search_count: {
                    type: 'long',
                    _meta: { description: 'The number of searches run by the datafeed' },
                  },
                  total_search_time_ms: {
                    type: 'long',
                    _meta: {
                      description: 'The total time the datafeed spent searching, in milliseconds',
                    },
                  },
                },
              },
            },
          },
        },
        legacy_siem_signals: {
          non_migrated_indices_total: {
            type: 'long',
            _meta: {
              description: 'Total number of non migrated legacy siem signals indices',
            },
          },
          spaces_total: {
            type: 'long',
            _meta: {
              description:
                'Total number of Kibana spaces that have non migrated legacy siem signals indices',
            },
          },
        },
      },
      endpointMetrics: {
        unique_endpoint_count: {
          type: 'long',
          _meta: { description: 'Number of active unique endpoints in last 24 hours' },
        },
      },
      dashboardMetrics: {
        dashboard_tag: {
          created_at: {
            type: 'keyword',
            _meta: { description: 'The time the tab was created' },
          },
          linked_dashboards_count: {
            type: 'long',
            _meta: { description: 'Number of associated dashboards' },
          },
        },
        dashboards: {
          type: 'array',
          items: {
            created_at: {
              type: 'keyword',
              _meta: { description: 'The time the dashboard was created' },
            },
            dashboard_id: {
              type: 'keyword',
              _meta: { description: 'The dashboard saved object id' },
            },
            error_message: {
              type: 'keyword',
              _meta: { description: 'The relevant error message' },
            },
            error_status_code: {
              type: 'long',
              _meta: { description: 'The relevant error status code' },
            },
          },
        },
      },
      riskEngineMetrics: riskEngineMetricsSchema,
      exceptionsMetrics: exceptionsMetricsSchema,
      valueListsMetrics: valueListsMetricsSchema,
    },
    isReady: () => true,
    fetch: async ({ esClient }: CollectorFetchContext): Promise<UsageData> => {
      const savedObjectsClient = await getInternalSavedObjectsClient(core);
      const [
        detectionMetrics,
        endpointMetrics,
        dashboardMetrics,
        riskEngineMetrics,
        exceptionsMetrics,
        valueListsMetrics,
      ] = await Promise.allSettled([
        getDetectionsMetrics({
          eventLogIndex,
          signalsIndex,
          esClient,
          savedObjectsClient,
          logger,
          mlClient: ml,
          legacySignalsIndex,
        }),
        getEndpointMetrics({ esClient, logger }),
        getDashboardMetrics({
          savedObjectsClient,
          logger,
        }),
        getRiskEngineMetrics({ esClient, logger, riskEngineIndexPatterns }),
        getExceptionsMetrics({ esClient, logger, savedObjectsClient }),
        getValueListsMetrics({ esClient, logger }),
      ]);
      return {
        detectionMetrics: detectionMetrics.status === 'fulfilled' ? detectionMetrics.value : {},
        endpointMetrics: endpointMetrics.status === 'fulfilled' ? endpointMetrics.value : {},
        dashboardMetrics: dashboardMetrics.status === 'fulfilled' ? dashboardMetrics.value : {},
        riskEngineMetrics: riskEngineMetrics.status === 'fulfilled' ? riskEngineMetrics.value : {},
        exceptionsMetrics: exceptionsMetrics.status === 'fulfilled' ? exceptionsMetrics.value : {},
        valueListsMetrics: valueListsMetrics.status === 'fulfilled' ? valueListsMetrics.value : {},
      };
    },
  });

  usageCollection.registerCollector(securitySolutionCollector);
};
