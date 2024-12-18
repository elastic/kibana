/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const stubEndpointMetricsAbstractResponse = {
  body: {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 2,
        relation: 'eq',
      },
      max_score: null,
      hits: [],
    },
    aggregations: {
      endpoint_count: {
        value: 1,
      },
      endpoint_agents: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: '7116aa6c-0bad-4edc-b954-860f9d487755',
            doc_count: 2,
            latest_metrics: {
              hits: {
                total: {
                  value: 2,
                  relation: 'eq',
                },
                max_score: null,
                hits: [
                  {
                    _index: '.ds-metrics-endpoint.metadata-default-2022.07.08-000001',
                    _id: 'ChGf7YEBj3fALY0Ne9um',
                    _score: null,
                    _source: {
                      id: '7116aa6c-0bad-4edc-b954-860f9d487755',
                    },
                    sort: [1657484259677],
                  },
                ],
              },
            },
          },
        ],
      },
    },
  },
};

export const stubEndpointMetricsByIdResponse = {
  body: {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 2,
        relation: 'eq',
      },
      max_score: null,
      hits: [
        {
          _index: '.ds-metrics-endpoint.metadata-default-2022.07.08-000001',
          _id: 'ChGf7YEBj3fALY0Ne9um',
          _score: null,
          _source: {
            agent: {
              id: '7116aa6c-0bad-4edc-b954-860f9d487755',
              type: 'endpoint',
              version: '7.16.11',
            },
            '@timestamp': 1657484259677,
            Endpoint: {
              capabilities: ['isolation'],
              configuration: {
                isolation: true,
              },
              state: {
                isolation: true,
              },
              status: 'enrolled',
              policy: {
                applied: {
                  name: 'With Eventing',
                  id: 'C2A9093E-E289-4C0A-AA44-8C32A414FA7A',
                  endpoint_policy_version: 3,
                  version: 5,
                  status: 'failure',
                },
              },
            },
            data_stream: {
              namespace: 'default',
              type: 'metrics',
              dataset: 'endpoint.metadata',
            },
            elastic: {
              agent: {
                id: '7116aa6c-0bad-4edc-b954-860f9d487755',
              },
            },
            host: {
              hostname: 'Host-x46nlluvd1',
              os: {
                Ext: {
                  variant: 'Windows Server Release 2',
                },
                name: 'Windows',
                family: 'windows',
                version: '6.3',
                platform: 'Windows',
                full: 'Windows Server 2012R2',
              },
              ip: ['10.198.33.76'],
              name: 'Host-x46nlluvd1',
              id: 'b85883ad-6f72-4ab5-9794-4e1f0593a15e',
              mac: ['b6-f3-d2-3d-b4-95', '33-5c-95-1e-20-17', 'b0-90-8a-57-82-1f'],
              architecture: '1dc25ub5gq',
            },
            event: {
              agent_id_status: 'auth_metadata_missing',
              ingested: '2022-07-11T14:17:41Z',
              created: 1657484259677,
              kind: 'metric',
              module: 'endpoint',
              action: 'endpoint_metadata',
              id: 'c7648bef-b723-4925-b9a1-b3953fbb2a23',
              category: ['host'],
              type: ['info'],
              dataset: 'endpoint.metadata',
            },
          },
          sort: [1657484259677],
        },
      ],
    },
  },
};
