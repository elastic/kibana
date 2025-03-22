/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@elastic/ebt/client';
import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type {
  DataStreams,
  IlmPolicies,
  IlmsStats,
  IndicesStats,
} from '../indices_metadata_service.types';

export const TELEMETRY_DATA_STREAM_EVENT: EventTypeOpts<DataStreams> = {
  eventType: 'metrics-data-access-data-stream-event',
  schema: {
    items: {
      type: 'array',
      items: {
        properties: {
          datastream_name: {
            type: 'keyword',
            _meta: { description: 'Name of the data stream' },
          },
          indices: {
            type: 'array',
            items: {
              properties: {
                index_name: { type: 'date', _meta: { description: 'Index name' } },
                ilm_policy: { type: 'date', _meta: { optional: true, description: 'ILM policy' } },
              },
            },
            _meta: { optional: true, description: 'Indices associated with the data stream' },
          },
        },
      },
      _meta: { description: 'Datastreams' },
    },
  },
};

export const TELEMETRY_INDEX_STATS_EVENT: EventTypeOpts<IndicesStats> = {
  eventType: 'metrics-data-access-index-stats-event',
  schema: {
    items: {
      type: 'array',
      items: {
        properties: {
          index_name: {
            type: 'keyword',
            _meta: { description: 'The name of the index being monitored.' },
          },
          query_total: {
            type: 'long',
            _meta: {
              optional: true,
              description: 'The total number of search queries executed on the index.',
            },
          },
          query_time_in_millis: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total time spent on query execution across all search requests, measured in milliseconds.',
            },
          },
          docs_count: {
            type: 'long',
            _meta: {
              optional: true,
              description: 'The total number of documents currently stored in the index.',
            },
          },
          docs_deleted: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total number of documents that have been marked as deleted in the index.',
            },
          },
          docs_total_size_in_bytes: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total size, in bytes, of all documents stored in the index, including storage overhead.',
            },
          },
        },
      },
      _meta: { description: 'Datastreams' },
    },
  },
};

export const TELEMETRY_ILM_STATS_EVENT: EventTypeOpts<IlmsStats> = {
  eventType: 'metrics-data-access-ilm-stats-event',
  schema: {
    items: {
      type: 'array',
      items: {
        properties: {
          index_name: {
            type: 'keyword',
            _meta: { description: 'The name of the index currently managed by the ILM  policy.' },
          },
          phase: {
            type: 'keyword',
            _meta: {
              optional: true,
              description:
                'The current phase of the ILM policy that the index is in (e.g., hot, warm, cold, frozen, or delete).',
            },
          },
          age: {
            type: 'text',
            _meta: {
              optional: true,
              description:
                'The age of the index since its creation, indicating how long it has existed.',
            },
          },
          policy_name: {
            type: 'keyword',
            _meta: {
              optional: true,
              description: 'The name of the ILM policy applied to this index.',
            },
          },
        },
      },
      _meta: { description: 'Datastreams' },
    },
  },
};

export const TELEMETRY_ILM_POLICY_EVENT: EventTypeOpts<IlmPolicies> = {
  eventType: 'metrics-data-access-ilm-policy-event',
  schema: {
    items: {
      type: 'array',
      items: {
        properties: {
          policy_name: {
            type: 'keyword',
            _meta: { description: 'The name of the ILM policy.' },
          },
          modified_date: {
            type: 'date',
            _meta: { description: 'The date when the ILM policy was last modified.' },
          },
          phases: {
            properties: {
              cold: {
                properties: {
                  min_age: {
                    type: 'text',
                    _meta: {
                      description:
                        'The minimum age before the index transitions to the "cold" phase.',
                    },
                  },
                },
                _meta: {
                  optional: true,
                  description:
                    'Configuration settings for the "cold" phase of the ILM policy, applied when data is infrequently accessed.',
                },
              },
              delete: {
                properties: {
                  min_age: {
                    type: 'text',
                    _meta: {
                      description:
                        'The minimum age before the index transitions to the "delete" phase.',
                    },
                  },
                },
                _meta: {
                  optional: true,
                  description:
                    'Configuration settings for the "delete" phase of the ILM policy, specifying when the index should be removed.',
                },
              },
              frozen: {
                properties: {
                  min_age: {
                    type: 'text',
                    _meta: {
                      description:
                        'The minimum age before the index transitions to the "frozen" phase.',
                    },
                  },
                },
                _meta: {
                  optional: true,
                  description:
                    'Configuration settings for the "frozen" phase of the ILM policy, where data is fully searchable but stored with a reduced resource footprint.',
                },
              },
              hot: {
                properties: {
                  min_age: {
                    type: 'text',
                    _meta: {
                      description:
                        'The minimum age before the index transitions to the "hot" phase.',
                    },
                  },
                },
                _meta: {
                  optional: true,
                  description:
                    'Configuration settings for the "hot" phase of the ILM policy, applied to actively written and queried data.',
                },
              },
              warm: {
                properties: {
                  min_age: {
                    type: 'text',
                    _meta: {
                      description:
                        'The minimum age before the index transitions to the "warm" phase.',
                    },
                  },
                },
                _meta: {
                  optional: true,
                  description:
                    'Configuration settings for the "warm" phase of the ILM policy, used for read-only data that is less frequently accessed.',
                },
              },
            },
            _meta: {
              description:
                'The different phases of the ILM policy that define how the index is managed over time.',
            },
          },
        },
      },
      _meta: { description: 'Datastreams' },
    },
  },
};

export const registerEvents = (analytics: AnalyticsServiceSetup) => {
  const events: Array<EventTypeOpts<{}>> = [
    TELEMETRY_DATA_STREAM_EVENT,
    TELEMETRY_INDEX_STATS_EVENT,
    TELEMETRY_ILM_STATS_EVENT,
    TELEMETRY_ILM_POLICY_EVENT,
  ];

  events.forEach((eventConfig) => {
    analytics.registerEventType(eventConfig);
  });
};
