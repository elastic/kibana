/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mock_agg_result = {
  took: 3111,
  timed_out: false,
  num_reduce_phases: 4,
  _shards: {
    total: 1611,
    successful: 1611,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 10000,
      relation: 'gte',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    by_index: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 21749,
      buckets: [
        {
          key: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
          doc_count: 66065897,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'iam',
                doc_count: 8771615,
              },
              {
                key: 'file',
                doc_count: 5342531,
              },
              {
                key: 'network',
                doc_count: 2973017,
              },
              {
                key: 'database',
                doc_count: 772074,
              },
              {
                key: 'authentication',
                doc_count: 724692,
              },
              {
                key: 'host',
                doc_count: 379064,
              },
              {
                key: 'configuration',
                doc_count: 77469,
              },
              {
                key: 'api',
                doc_count: 55900,
              },
              {
                key: 'package',
                doc_count: 443,
              },
            ],
          },
        },
        {
          key: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
          doc_count: 65943579,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'iam',
                doc_count: 8799813,
              },
              {
                key: 'file',
                doc_count: 5042710,
              },
              {
                key: 'network',
                doc_count: 3001441,
              },
              {
                key: 'database',
                doc_count: 788134,
              },
              {
                key: 'authentication',
                doc_count: 625117,
              },
              {
                key: 'host',
                doc_count: 357609,
              },
              {
                key: 'configuration',
                doc_count: 80559,
              },
              {
                key: 'api',
                doc_count: 66146,
              },
              {
                key: 'package',
                doc_count: 405,
              },
            ],
          },
        },
        {
          key: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
          doc_count: 58434865,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'file',
                doc_count: 12766707,
              },
              {
                key: 'iam',
                doc_count: 6159948,
              },
              {
                key: 'network',
                doc_count: 2071194,
              },
              {
                key: 'database',
                doc_count: 543918,
              },
              {
                key: 'authentication',
                doc_count: 470127,
              },
              {
                key: 'host',
                doc_count: 250363,
              },
              {
                key: 'configuration',
                doc_count: 55269,
              },
              {
                key: 'api',
                doc_count: 41919,
              },
              {
                key: 'package',
                doc_count: 291,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2025.05.21-000011',
          doc_count: 53676172,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2025.08.19-000014',
          doc_count: 53617591,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2025.09.18-000015',
          doc_count: 53035030,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2025.06.20-000012',
          doc_count: 52721795,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2025.10.18-000016',
          doc_count: 52486959,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2025.07.20-000013',
          doc_count: 51846421,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2025.04.21-000010',
          doc_count: 51093498,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2025.03.22-000009',
          doc_count: 50798331,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-azure.eventhub-default-2025.03.04-000001',
          doc_count: 46971620,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: 'partial-.ds-logs-azure.activitylogs-default-2025.03.04-000001',
          doc_count: 46962514,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2025.08.30-000015',
          doc_count: 42690844,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2025.07.31-000014',
          doc_count: 42334282,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2025.02.20-000008',
          doc_count: 41709086,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2025.05.21-000011',
          doc_count: 37729605,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2025.04.21-000010',
          doc_count: 36039225,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2025.03.22-000009',
          doc_count: 35301731,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2025.06.20-000012',
          doc_count: 35197314,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2025.08.19-000014',
          doc_count: 34741290,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
          doc_count: 34278624,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'iam',
                doc_count: 4646951,
              },
              {
                key: 'file',
                doc_count: 2696465,
              },
              {
                key: 'network',
                doc_count: 1558897,
              },
              {
                key: 'database',
                doc_count: 404895,
              },
              {
                key: 'authentication',
                doc_count: 403374,
              },
              {
                key: 'host',
                doc_count: 202196,
              },
              {
                key: 'configuration',
                doc_count: 40805,
              },
              {
                key: 'api',
                doc_count: 28195,
              },
              {
                key: 'package',
                doc_count: 243,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2025.07.20-000013',
          doc_count: 34209723,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2025.09.18-000015',
          doc_count: 33557389,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-azure.eventhub-default-2025.04.03-000002',
          doc_count: 33120217,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2025.01.21-000007',
          doc_count: 32752830,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.apiserver-default-2025.10.18-000001',
          doc_count: 31796681,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2025.10.18-000016',
          doc_count: 31479235,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2024.12.22-000006',
          doc_count: 30171972,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2024.11.22-000005',
          doc_count: 29724448,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2025.02.20-000008',
          doc_count: 28144917,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2024.10.23-000004',
          doc_count: 27570648,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2024.08.24-000002',
          doc_count: 26595256,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2024.09.23-000003',
          doc_count: 26018113,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2024.07.25-000001',
          doc_count: 22867713,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2025.01.21-000007',
          doc_count: 20904194,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2024.12.22-000006',
          doc_count: 19304715,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2024.11.22-000005',
          doc_count: 18547007,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2025.05.21-000011',
          doc_count: 16889948,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2024.08.24-000002',
          doc_count: 16537492,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2024.10.23-000004',
          doc_count: 16485203,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2025.04.21-000010',
          doc_count: 16277815,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2024.09.23-000003',
          doc_count: 16124437,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2025.08.19-000014',
          doc_count: 16073721,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2025.06.20-000012',
          doc_count: 16073019,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2025.03.22-000009',
          doc_count: 16054201,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2025.07.20-000013',
          doc_count: 15825486,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2025.09.18-000015',
          doc_count: 15600691,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2024.07.25-000001',
          doc_count: 15515279,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2025.10.18-000016',
          doc_count: 15266536,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.diskio-default-2025.11.17-000017',
          doc_count: 13951580,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2025.07.31-000014',
          doc_count: 13836462,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2025.08.30-000015',
          doc_count: 13358033,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2025.02.20-000008',
          doc_count: 12866677,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-kubernetes.container_logs-default-2025.10.18-000001',
          doc_count: 10131577,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2025.01.21-000007',
          doc_count: 9540943,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.apiserver-default-2025.11.17-000002',
          doc_count: 8914755,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2024.12.22-000006',
          doc_count: 8807420,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2024.11.22-000005',
          doc_count: 8639774,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process-default-2025.11.17-000017',
          doc_count: 8311332,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2024.08.24-000002',
          doc_count: 8036975,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2024.10.23-000004',
          doc_count: 7990452,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2024.09.23-000003',
          doc_count: 7789157,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2025.10.08-000017',
          doc_count: 7771720,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2025.04.15-000010',
          doc_count: 7662893,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2025.03.16-000009',
          doc_count: 7634319,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2025.05.15-000011',
          doc_count: 7633513,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2024.07.25-000001',
          doc_count: 7559405,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2025.08.30-000015',
          doc_count: 7478826,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2025.07.31-000014',
          doc_count: 7391935,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2024.11.17-000005',
          doc_count: 6662178,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2025.05.21-000012',
          doc_count: 6561636,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2025.04.21-000011',
          doc_count: 6286589,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2025.06.20-000013',
          doc_count: 6195948,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2025.08.19-000015',
          doc_count: 6049205,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2025.07.20-000014',
          doc_count: 5965610,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2025.10.18-000017',
          doc_count: 5891894,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2025.09.18-000016',
          doc_count: 5865435,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2025.06.14-000012',
          doc_count: 5854365,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2025.03.04-000009',
          doc_count: 5262850,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2025.05.21-000011',
          doc_count: 4938686,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2025.05.21-000011',
          doc_count: 4938685,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2025.05.21-000011',
          doc_count: 4938683,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2025.05.21-000011',
          doc_count: 4938681,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2025.05.21-000011',
          doc_count: 4938679,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2025.05.21-000011',
          doc_count: 4938678,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2025.11.07-000018',
          doc_count: 4898105,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2025.04.21-000010',
          doc_count: 4831926,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2025.04.21-000010',
          doc_count: 4831675,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2025.04.21-000010',
          doc_count: 4831107,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2025.08.19-000014',
          doc_count: 4666565,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2025.08.19-000014',
          doc_count: 4666564,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2025.08.19-000014',
          doc_count: 4666563,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2025.08.19-000014',
          doc_count: 4666562,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2025.08.19-000014',
          doc_count: 4666561,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2025.08.19-000014',
          doc_count: 4666560,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2025.06.20-000012',
          doc_count: 4666399,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2025.06.20-000012',
          doc_count: 4666396,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2025.06.20-000012',
          doc_count: 4666395,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2025.06.20-000012',
          doc_count: 4666394,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2025.06.20-000012',
          doc_count: 4666392,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2025.06.20-000012',
          doc_count: 4666391,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2025.04.21-000010',
          doc_count: 4651434,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2025.04.21-000010',
          doc_count: 4651233,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2025.04.21-000010',
          doc_count: 4649842,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2025.07.20-000013',
          doc_count: 4596572,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2025.07.20-000013',
          doc_count: 4596528,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2025.07.20-000013',
          doc_count: 4596523,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2025.07.20-000013',
          doc_count: 4596489,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2025.07.20-000013',
          doc_count: 4596480,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2025.07.20-000013',
          doc_count: 4596469,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2025.09.18-000015',
          doc_count: 4508935,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2025.09.18-000015',
          doc_count: 4508930,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2025.09.18-000015',
          doc_count: 4508928,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2025.09.18-000015',
          doc_count: 4508916,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2025.09.18-000015',
          doc_count: 4508904,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2025.09.18-000015',
          doc_count: 4508904,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2025.03.22-000009',
          doc_count: 4487490,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2025.03.22-000009',
          doc_count: 4487462,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2025.03.22-000009',
          doc_count: 4487445,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2025.03.22-000009',
          doc_count: 4487366,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2025.03.22-000009',
          doc_count: 4487347,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2025.03.22-000009',
          doc_count: 4487342,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2025.10.18-000016',
          doc_count: 4402435,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2025.10.18-000016',
          doc_count: 4402320,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2025.10.18-000016',
          doc_count: 4402319,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2025.10.18-000016',
          doc_count: 4401870,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2025.10.18-000016',
          doc_count: 4401660,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2025.10.18-000016',
          doc_count: 4401544,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2025.10.08-000017',
          doc_count: 4169130,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2025.07.14-000013',
          doc_count: 4092211,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.network-default-2025.11.17-000017',
          doc_count: 4054877,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2025.01.21-000007',
          doc_count: 3955349,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.volume-default-2025.10.18-000001',
          doc_count: 3583814,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2025.02.20-000008',
          doc_count: 3537416,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2025.02.20-000008',
          doc_count: 3537324,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2025.02.20-000008',
          doc_count: 3537304,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2025.02.20-000008',
          doc_count: 3537164,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2025.02.20-000008',
          doc_count: 3537163,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2025.02.20-000008',
          doc_count: 3537149,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2025.04.03-000010',
          doc_count: 3510429,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2025.11.07-000018',
          doc_count: 3461945,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2024.12.22-000006',
          doc_count: 3364034,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.container-default-2025.10.18-000001',
          doc_count: 3324706,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.pod-default-2025.10.18-000001',
          doc_count: 3324469,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2025.05.21-000012',
          doc_count: 2896125,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2025.04.15-000010',
          doc_count: 2854743,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2024.11.22-000005',
          doc_count: 2827316,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2025.03.16-000009',
          doc_count: 2681999,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2025.08.19-000015',
          doc_count: 2678933,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2025.06.20-000013',
          doc_count: 2678795,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2025.07.20-000014',
          doc_count: 2640474,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2025.04.21-000011',
          doc_count: 2631560,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2025.10.18-000017',
          doc_count: 2626916,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2025.09.18-000016',
          doc_count: 2600164,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2025.01.21-000007',
          doc_count: 2575598,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2025.01.21-000007',
          doc_count: 2575589,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2025.01.21-000007',
          doc_count: 2575583,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2025.01.21-000007',
          doc_count: 2575556,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2025.01.21-000007',
          doc_count: 2575553,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2025.01.21-000007',
          doc_count: 2575552,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.proxy-default-2025.10.18-000001',
          doc_count: 2567381,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2025.05.15-000011',
          doc_count: 2545658,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2025.04.02-000010',
          doc_count: 2506473,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2024.08.24-000002',
          doc_count: 2419739,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2024.10.23-000004',
          doc_count: 2401637,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2024.09.23-000003',
          doc_count: 2354828,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2024.12.22-000006',
          doc_count: 2332211,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2024.12.22-000006',
          doc_count: 2332172,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2024.12.22-000006',
          doc_count: 2332137,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2024.12.22-000006',
          doc_count: 2332031,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2024.12.22-000006',
          doc_count: 2332008,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2024.12.22-000006',
          doc_count: 2332004,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2025.09.29-000016',
          doc_count: 2322601,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2024.11.22-000005',
          doc_count: 2275471,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2024.11.22-000005',
          doc_count: 2275437,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2024.11.22-000005',
          doc_count: 2275424,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2024.11.22-000005',
          doc_count: 2275376,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2024.11.22-000005',
          doc_count: 2275375,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2024.11.22-000005',
          doc_count: 2275364,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2024.07.25-000001',
          doc_count: 2272676,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2025.03.04-000009',
          doc_count: 2248347,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-kubernetes.container_logs-default-2025.11.17-000002',
          doc_count: 2183124,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2024.08.24-000002',
          doc_count: 2074064,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2024.08.24-000002',
          doc_count: 2074064,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2024.08.24-000002',
          doc_count: 2074064,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2024.08.24-000002',
          doc_count: 2074063,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2024.08.24-000002',
          doc_count: 2074063,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2024.08.24-000002',
          doc_count: 2074063,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2024.10.23-000004',
          doc_count: 2058545,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2024.10.23-000004',
          doc_count: 2058545,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2024.10.23-000004',
          doc_count: 2058545,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2024.10.23-000004',
          doc_count: 2058543,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2024.10.23-000004',
          doc_count: 2058543,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2024.10.23-000004',
          doc_count: 2058542,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2024.09.23-000003',
          doc_count: 2018420,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2024.09.23-000003',
          doc_count: 2018419,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2024.09.23-000003',
          doc_count: 2018419,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2024.09.23-000003',
          doc_count: 2018419,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2024.09.23-000003',
          doc_count: 2018417,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2024.09.23-000003',
          doc_count: 2018417,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.10.28-000017',
          doc_count: 1984118,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 1984118,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.09.28-000016',
          doc_count: 1970313,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 1970313,
              },
            ],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2025.06.14-000012',
          doc_count: 1954240,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2025.08.30-000015',
          doc_count: 1948055,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2024.07.25-000001',
          doc_count: 1947965,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2024.07.25-000001',
          doc_count: 1947964,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2024.07.25-000001',
          doc_count: 1947964,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2024.07.25-000001',
          doc_count: 1947963,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2024.07.25-000001',
          doc_count: 1947961,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2024.07.25-000001',
          doc_count: 1947960,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_defend.process-default-2024.09.26-000003',
          doc_count: 1925868,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'process',
                doc_count: 1925868,
              },
            ],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2025.07.31-000014',
          doc_count: 1925561,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_defend.process-default-2024.10.26-000004',
          doc_count: 1925486,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'process',
                doc_count: 1925486,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_defend.process-default-2024.08.27-000002',
          doc_count: 1924930,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'process',
                doc_count: 1924930,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_defend.process-default-2024.12.16-000006',
          doc_count: 1888873,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'process',
                doc_count: 1888873,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_defend.process-default-2024.07.28-000001',
          doc_count: 1886247,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'process',
                doc_count: 1886247,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.08.29-000015',
          doc_count: 1859262,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 1859262,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2025.03.22-000009',
          doc_count: 1809638,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.07.30-000014',
          doc_count: 1775640,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 1775640,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2025.10.18-000016',
          doc_count: 1765341,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2025.05.21-000011',
          doc_count: 1670805,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2025.01.21-000007',
          doc_count: 1633413,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2025.04.21-000010',
          doc_count: 1627708,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2025.08.19-000014',
          doc_count: 1598736,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2025.06.20-000012',
          doc_count: 1598713,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2025.02.20-000008',
          doc_count: 1595332,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2025.07.20-000013',
          doc_count: 1589495,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2025.05.21-000012',
          doc_count: 1574702,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2025.09.18-000015',
          doc_count: 1572447,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.elastic_agent-default-2025.11.17-000018',
          doc_count: 1569272,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2025.10.18-000016',
          doc_count: 1554638,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.system-default-2025.10.18-000001',
          doc_count: 1541045,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2025.04.21-000011',
          doc_count: 1509794,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2025.04.03-000010',
          doc_count: 1496500,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.03.04-000009',
          doc_count: 1490554,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 1490554,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2025.10.18-000017',
          doc_count: 1465139,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.07.02-000013',
          doc_count: 1463291,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 1463291,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.05.03-000011',
          doc_count: 1459683,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 1459683,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.06.02-000012',
          doc_count: 1451480,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 1451480,
              },
            ],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2025.02.14-000008',
          doc_count: 1450576,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_defend.process-default-2025.03.19-000009',
          doc_count: 1444716,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'process',
                doc_count: 1444716,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2025.03.04-000009',
          doc_count: 1439899,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_defend.process-default-2025.04.18-000010',
          doc_count: 1438728,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'process',
                doc_count: 1438728,
              },
            ],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2025.09.29-000016',
          doc_count: 1434689,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2025.08.19-000015',
          doc_count: 1425829,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2025.06.20-000013',
          doc_count: 1425642,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.04.03-000010',
          doc_count: 1418453,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 1418453,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2025.07.20-000014',
          doc_count: 1415744,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2024.11.17-000005',
          doc_count: 1404720,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.02.02-000008',
          doc_count: 1400155,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 1400155,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2025.09.18-000016',
          doc_count: 1399504,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2024.12.22-000006',
          doc_count: 1388759,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2025.02.20-000008',
          doc_count: 1355882,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2025.06.14-000012',
          doc_count: 1351355,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_defend.process-default-2025.05.18-000011',
          doc_count: 1343644,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'process',
                doc_count: 1343644,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_defend.process-default-2024.11.25-000005',
          doc_count: 1307911,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'process',
                doc_count: 1307911,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.01.03-000007',
          doc_count: 1219975,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 1219975,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2025.08.19-000014',
          doc_count: 1209831,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2025.04.02-000010',
          doc_count: 1189054,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 227238,
              },
              {
                key: 'session',
                doc_count: 49439,
              },
              {
                key: 'process',
                doc_count: 100,
              },
              {
                key: 'iam',
                doc_count: 38,
              },
            ],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2025.09.29-000016',
          doc_count: 1188475,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 328011,
              },
              {
                key: 'session',
                doc_count: 26872,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2024.11.22-000005',
          doc_count: 1187026,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2025.09.18-000015',
          doc_count: 1183604,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.load-default-2025.11.17-000017',
          doc_count: 1168362,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.uptime-default-2025.11.17-000017',
          doc_count: 1168362,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.cpu-default-2025.11.17-000017',
          doc_count: 1168361,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.memory-default-2025.11.17-000017',
          doc_count: 1168360,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.socket_summary-default-2025.11.17-000017',
          doc_count: 1168357,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.process.summary-default-2025.11.17-000017',
          doc_count: 1168356,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2025.07.20-000013',
          doc_count: 1157165,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2025.05.21-000011',
          doc_count: 1155877,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.12.04-000006',
          doc_count: 1149735,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 1149735,
              },
            ],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2025.04.15-000010',
          doc_count: 1135037,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2025.06.20-000012',
          doc_count: 1123409,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2025.07.14-000013',
          doc_count: 1118054,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2025.04.21-000010',
          doc_count: 1105206,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2025.07.14-000013',
          doc_count: 1089242,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2025.03.22-000009',
          doc_count: 1076261,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2025.08.30-000015',
          doc_count: 1051147,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 218297,
              },
              {
                key: 'session',
                doc_count: 26898,
              },
            ],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2025.03.16-000009',
          doc_count: 1043591,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2025.02.14-000008',
          doc_count: 1043317,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2024.12.16-000006',
          doc_count: 1041900,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2025.01.15-000007',
          doc_count: 1041536,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2025.03.03-000009',
          doc_count: 1039144,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 210926,
              },
              {
                key: 'session',
                doc_count: 53010,
              },
              {
                key: 'iam',
                doc_count: 194,
              },
              {
                key: 'process',
                doc_count: 50,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2024.08.24-000002',
          doc_count: 1037026,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2024.10.23-000004',
          doc_count: 1029263,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2024.09.23-000003',
          doc_count: 1009202,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2025.10.29-000017',
          doc_count: 1002445,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 239675,
              },
              {
                key: 'session',
                doc_count: 24336,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2024.07.25-000001',
          doc_count: 973968,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.volume-default-2025.11.17-000002',
          doc_count: 948752,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2025.04.03-000010',
          doc_count: 945821,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.container-default-2025.11.17-000002',
          doc_count: 880984,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.pod-default-2025.11.17-000002',
          doc_count: 880984,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2025.07.31-000014',
          doc_count: 870448,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 123301,
              },
              {
                key: 'session',
                doc_count: 26874,
              },
              {
                key: 'iam',
                doc_count: 8,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2025.01.21-000007',
          doc_count: 858560,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2025.01.21-000007',
          doc_count: 855836,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2025.05.21-000011',
          doc_count: 823123,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.10.23-000004',
          doc_count: 820089,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 820089,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2025.02.20-000008',
          doc_count: 817693,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2025.05.21-000012',
          doc_count: 810395,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2025.04.21-000010',
          doc_count: 805575,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2025.05.02-000011',
          doc_count: 792905,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 181757,
              },
              {
                key: 'session',
                doc_count: 26896,
              },
            ],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2025.05.15-000011',
          doc_count: 787088,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2025.08.19-000014',
          doc_count: 777764,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2025.06.20-000012',
          doc_count: 777760,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2025.06.14-000012',
          doc_count: 774072,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2025.07.20-000013',
          doc_count: 766160,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2025.04.21-000011',
          doc_count: 759120,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2025.09.18-000015',
          doc_count: 751495,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2025.03.22-000009',
          doc_count: 747962,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2024.12.22-000006',
          doc_count: 734460,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2025.10.18-000016',
          doc_count: 733898,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2025.07.01-000013',
          doc_count: 732890,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 105658,
              },
              {
                key: 'session',
                doc_count: 26940,
              },
              {
                key: 'process',
                doc_count: 120,
              },
              {
                key: 'iam',
                doc_count: 6,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2024.11.22-000005',
          doc_count: 731742,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2024.12.22-000006',
          doc_count: 715944,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: 'logs-cloud_security_posture.scores-default',
          doc_count: 700900,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2025.11.17-000018',
          doc_count: 698720,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2024.08.24-000002',
          doc_count: 691360,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2025.01.21-000007',
          doc_count: 688416,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2024.10.23-000004',
          doc_count: 683592,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2024.09.23-000003',
          doc_count: 682085,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.proxy-default-2025.11.17-000002',
          doc_count: 677680,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.metricbeat-default-2025.02.20-000008',
          doc_count: 658897,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2024.07.25-000001',
          doc_count: 652314,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2025.06.20-000013',
          doc_count: 645085,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2024.11.22-000005',
          doc_count: 629759,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2025.09.29-000016',
          doc_count: 604047,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2025.01.21-000007',
          doc_count: 602108,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2025.06.01-000012',
          doc_count: 598456,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 164818,
              },
              {
                key: 'session',
                doc_count: 29221,
              },
              {
                key: 'iam',
                doc_count: 37,
              },
              {
                key: 'process',
                doc_count: 2,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2025.02.20-000008',
          doc_count: 589675,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2024.12.22-000006',
          doc_count: 586389,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2025.03.03-000009',
          doc_count: 576732,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2025.09.29-000016',
          doc_count: 576405,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2025.03.04-000009',
          doc_count: 573677,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2024.08.24-000002',
          doc_count: 561726,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2025.02.14-000008',
          doc_count: 559450,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2025.08.19-000015',
          doc_count: 559432,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2024.10.23-000004',
          doc_count: 556550,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2024.09.23-000003',
          doc_count: 552451,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2025.09.18-000016',
          doc_count: 534488,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2024.07.25-000001',
          doc_count: 530710,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2025.07.20-000014',
          doc_count: 524111,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2025.10.18-000017',
          doc_count: 516380,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.node-default-2025.10.18-000001',
          doc_count: 513775,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2025.05.02-000011',
          doc_count: 505712,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2024.12.22-000006',
          doc_count: 500010,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2025.11.17-000017',
          doc_count: 470721,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2024.11.17-000005',
          doc_count: 455164,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2024.11.22-000005',
          doc_count: 445502,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2025.09.18-000016',
          doc_count: 431770,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2025.08.19-000015',
          doc_count: 431730,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2025.10.18-000017',
          doc_count: 431710,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2025.01.21-000007',
          doc_count: 429280,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.filesystem-default-2025.11.17-000017',
          doc_count: 412362,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2025.07.20-000014',
          doc_count: 410180,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2024.11.22-000005',
          doc_count: 408884,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.system-default-2025.11.17-000002',
          doc_count: 406608,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2025.05.21-000012',
          doc_count: 401872,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2025.04.03-000010',
          doc_count: 392598,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2025.11.17-000018',
          doc_count: 389388,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2025.06.20-000013',
          doc_count: 388800,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2024.12.22-000006',
          doc_count: 388782,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2024.11.22-000005',
          doc_count: 379321,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2025.04.21-000011',
          doc_count: 362666,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-messaging_service_aws_sns_topic-default-2025.09.29-000007',
          doc_count: 354368,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat-default-2025.02.20-000008',
          doc_count: 346826,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2024.08.24-000002',
          doc_count: 345679,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2024.08.24-000002',
          doc_count: 345677,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2024.08.24-000002',
          doc_count: 345676,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-messaging_service_aws_sns_topic-default-2025.07.31-000005',
          doc_count: 343294,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2024.10.23-000004',
          doc_count: 343091,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2024.10.23-000004',
          doc_count: 343088,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2024.10.23-000004',
          doc_count: 342778,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.09.23-000003',
          doc_count: 340004,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 340004,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2024.09.23-000003',
          doc_count: 336405,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2024.09.23-000003',
          doc_count: 336402,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2024.09.23-000003',
          doc_count: 336377,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-messaging_service_aws_sns_topic-default-2025.05.24-000002',
          doc_count: 332220,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-messaging_service_aws_sns_topic-default-2025.08.30-000006',
          doc_count: 332220,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2024.07.25-000001',
          doc_count: 324668,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2024.07.25-000001',
          doc_count: 324523,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.filebeat_input-default-2024.07.25-000001',
          doc_count: 324421,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.07.25-000001',
          doc_count: 323449,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 323449,
              },
            ],
          },
        },
        {
          key: '.ds-logs-endpoint.events.file-default-2025.03.21-000002',
          doc_count: 322536,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'file',
                doc_count: 322536,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-messaging_service_aws_sns_topic-default-2025.04.24-000001',
          doc_count: 321146,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-messaging_service_aws_sns_topic-default-2025.10.29-000008',
          doc_count: 321146,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2025.06.01-000012',
          doc_count: 319352,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_defend.process-default-2025.01.15-000007',
          doc_count: 306217,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'process',
                doc_count: 306217,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2025.03.22-000009',
          doc_count: 296009,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2025.10.29-000017',
          doc_count: 285828,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2025.02.20-000008',
          doc_count: 285003,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2025.10.08-000017',
          doc_count: 278206,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2025.02.20-000008',
          doc_count: 277421,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-messaging_service_aws_sns_topic-default-2025.06.23-000003',
          doc_count: 276850,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_resourcequota-default-2025.10.18-000001',
          doc_count: 258589,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_persistentvolumeclaim-default-2025.10.18-000001',
          doc_count: 258535,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_namespace-default-2025.10.18-000001',
          doc_count: 258534,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_service-default-2025.10.18-000001',
          doc_count: 258533,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_daemonset-default-2025.10.18-000001',
          doc_count: 258532,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_cronjob-default-2025.10.18-000001',
          doc_count: 258529,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_deployment-default-2025.10.18-000001',
          doc_count: 258529,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_node-default-2025.10.18-000001',
          doc_count: 258528,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_replicaset-default-2025.10.18-000001',
          doc_count: 258528,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_persistentvolume-default-2025.10.18-000001',
          doc_count: 258527,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_container-default-2025.10.18-000001',
          doc_count: 258526,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_pod-default-2025.10.18-000001',
          doc_count: 258523,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_statefulset-default-2025.10.18-000001',
          doc_count: 258522,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_storageclass-default-2025.10.18-000001',
          doc_count: 258519,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_job-default-2025.10.18-000001',
          doc_count: 258518,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2025.07.31-000014',
          doc_count: 256775,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-gcp.audit-default-2025.10.02-000010',
          doc_count: 246872,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 243742,
              },
              {
                key: 'network',
                doc_count: 243742,
              },
              {
                key: 'session',
                doc_count: 3055,
              },
            ],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2024.10.18-000004',
          doc_count: 234505,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2025.08.30-000015',
          doc_count: 234282,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2025.09.29-000016',
          doc_count: 231057,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2025.07.01-000013',
          doc_count: 228852,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2025.01.21-000007',
          doc_count: 214300,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2025.10.29-000017',
          doc_count: 212448,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2024.09.23-000003',
          doc_count: 211786,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2024.08.24-000002',
          doc_count: 209278,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_messaging_notification-service_sns-topic-default-2025.02.22-000004',
          doc_count: 204803,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.findings-default-2025.05.08-000015',
          doc_count: 197746,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 197746,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-system.fsstat-default-2025.11.17-000017',
          doc_count: 194731,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_messaging_notification-service_sns-topic-default-2025.01.23-000003',
          doc_count: 193540,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2024.07.25-000001',
          doc_count: 193263,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2024.10.23-000004',
          doc_count: 192759,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.findings-default-2025.06.07-000018',
          doc_count: 186179,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 186179,
              },
            ],
          },
        },
        {
          key: '.internal.alerts-security.alerts-default-000009',
          doc_count: 183014,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'file',
                doc_count: 116159,
              },
              {
                key: 'session',
                doc_count: 51061,
              },
              {
                key: 'process',
                doc_count: 10803,
              },
              {
                key: 'network',
                doc_count: 2563,
              },
              {
                key: 'configuration',
                doc_count: 825,
              },
              {
                key: 'vulnerability',
                doc_count: 741,
              },
              {
                key: 'authentication',
                doc_count: 2,
              },
            ],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2024.09.18-000003',
          doc_count: 176548,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-gcp.audit-default-2025.07.04-000007',
          doc_count: 175746,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 170668,
              },
              {
                key: 'network',
                doc_count: 170668,
              },
              {
                key: 'session',
                doc_count: 4605,
              },
            ],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2024.12.03-000006',
          doc_count: 175383,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2024.12.22-000006',
          doc_count: 172800,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_messaging_notification-service_sns-topic-default-2025.03.24-000005',
          doc_count: 171644,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.findings-default-2025.09.28-000025',
          doc_count: 169503,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 169503,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.findings-default-2025.07.30-000021',
          doc_count: 168901,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 168901,
              },
            ],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2025.07.14-000013',
          doc_count: 168418,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-gcp.audit-default-2025.04.05-000004',
          doc_count: 166029,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 161424,
              },
              {
                key: 'network',
                doc_count: 161424,
              },
              {
                key: 'session',
                doc_count: 4563,
              },
            ],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2025.02.01-000008',
          doc_count: 165888,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2025.01.15-000007',
          doc_count: 165816,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2024.12.16-000006',
          doc_count: 160619,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.findings-default-2025.08.29-000023',
          doc_count: 157900,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 157900,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.findings-default-2025.10.28-000027',
          doc_count: 149414,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 149414,
              },
            ],
          },
        },
        {
          key: '.ds-logs-gcp.audit-default-2025.06.04-000006',
          doc_count: 144026,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 140326,
              },
              {
                key: 'network',
                doc_count: 140326,
              },
              {
                key: 'session',
                doc_count: 3287,
              },
            ],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2024.10.23-000004',
          doc_count: 140667,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 33938,
              },
              {
                key: 'session',
                doc_count: 3112,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.cloudbeat-default-2025.11.17-000018',
          doc_count: 137457,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.node-default-2025.11.17-000002',
          doc_count: 135537,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2025.01.02-000007',
          doc_count: 134089,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.findings-default-2025.07.07-000020',
          doc_count: 130873,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 130873,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.08.24-000002',
          doc_count: 129858,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 129858,
              },
            ],
          },
        },
        {
          key: '.ds-logs-gcp.audit-default-2025.08.03-000008',
          doc_count: 124719,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 120418,
              },
              {
                key: 'network',
                doc_count: 120418,
              },
              {
                key: 'session',
                doc_count: 3606,
              },
            ],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2024.10.18-000004',
          doc_count: 124387,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2024.12.16-000006',
          doc_count: 122919,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2025.11.07-000018',
          doc_count: 119214,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2024.07.25-000001',
          doc_count: 119094,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.11.22-000005',
          doc_count: 118810,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 118810,
              },
            ],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2024.09.18-000003',
          doc_count: 118606,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2025.01.15-000007',
          doc_count: 116801,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2024.07.25-000001',
          doc_count: 115343,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2025.11.17-000018',
          doc_count: 114420,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-gcp.audit-default-2025.09.02-000009',
          doc_count: 112724,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 109780,
              },
              {
                key: 'network',
                doc_count: 109780,
              },
              {
                key: 'session',
                doc_count: 2669,
              },
            ],
          },
        },
        {
          key: '.ds-logs-gcp.audit-default-2025.03.06-000003',
          doc_count: 108635,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 105889,
              },
              {
                key: 'network',
                doc_count: 105889,
              },
              {
                key: 'session',
                doc_count: 2994,
              },
            ],
          },
        },
        {
          key: '.ds-logs-gcp.audit-default-2025.05.05-000005',
          doc_count: 107182,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 104298,
              },
              {
                key: 'network',
                doc_count: 104298,
              },
              {
                key: 'session',
                doc_count: 2587,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2024.11.22-000005',
          doc_count: 105600,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent-default-2024.08.24-000002',
          doc_count: 102969,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloudbeat-default-2024.08.24-000002',
          doc_count: 100869,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-gcp.audit-default-2025.11.01-000011',
          doc_count: 96031,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 93765,
              },
              {
                key: 'network',
                doc_count: 93765,
              },
              {
                key: 'session',
                doc_count: 2219,
              },
            ],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2025.03.16-000009',
          doc_count: 83963,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2025.04.15-000010',
          doc_count: 76285,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: 'logs-cloud_security_posture.vulnerabilities_latest-default',
          doc_count: 70743,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'vulnerability',
                doc_count: 70743,
              },
            ],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2025.02.01-000008',
          doc_count: 68806,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 18606,
              },
              {
                key: 'session',
                doc_count: 13468,
              },
              {
                key: 'iam',
                doc_count: 84,
              },
              {
                key: 'process',
                doc_count: 1,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-subnet_gcp_subnet-default-2025.06.22-000004',
          doc_count: 68685,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_container-default-2025.11.17-000002',
          doc_count: 67769,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_job-default-2025.11.17-000002',
          doc_count: 67769,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_persistentvolume-default-2025.11.17-000002',
          doc_count: 67769,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_replicaset-default-2025.11.17-000002',
          doc_count: 67769,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_cronjob-default-2025.11.17-000002',
          doc_count: 67768,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_daemonset-default-2025.11.17-000002',
          doc_count: 67768,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_deployment-default-2025.11.17-000002',
          doc_count: 67768,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_namespace-default-2025.11.17-000002',
          doc_count: 67768,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_node-default-2025.11.17-000002',
          doc_count: 67768,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_persistentvolumeclaim-default-2025.11.17-000002',
          doc_count: 67768,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_pod-default-2025.11.17-000002',
          doc_count: 67768,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_resourcequota-default-2025.11.17-000002',
          doc_count: 67768,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_service-default-2025.11.17-000002',
          doc_count: 67768,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_statefulset-default-2025.11.17-000002',
          doc_count: 67768,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.state_storageclass-default-2025.11.17-000002',
          doc_count: 67768,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.syslog-default-2024.11.22-000005',
          doc_count: 55716,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2024.12.03-000006',
          doc_count: 54320,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 13917,
              },
              {
                key: 'session',
                doc_count: 4050,
              },
              {
                key: 'process',
                doc_count: 93,
              },
              {
                key: 'iam',
                doc_count: 83,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-subnet_gcp_subnet-default-2025.05.23-000003',
          doc_count: 52086,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2025.05.15-000011',
          doc_count: 51414,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-subnet_gcp_subnet-default-2025.04.23-000002',
          doc_count: 50779,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2025.02.14-000008',
          doc_count: 50199,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_messaging_notification-service_sns-topic-default-2025.06.23-000009',
          doc_count: 49833,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-subnet_gcp_subnet-default-2025.09.29-000008',
          doc_count: 47016,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-messaging_service_aws_sns_topic-default-2025.07.23-000004',
          doc_count: 44296,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2024.12.22-000006',
          doc_count: 43200,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2025.03.22-000009',
          doc_count: 43200,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2025.05.21-000012',
          doc_count: 43200,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2025.06.20-000013',
          doc_count: 43200,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2025.02.20-000008',
          doc_count: 43194,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2025.07.20-000014',
          doc_count: 43189,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2025.04.21-000011',
          doc_count: 43188,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2025.01.21-000007',
          doc_count: 43186,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2025.09.18-000016',
          doc_count: 43177,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2025.08.19-000015',
          doc_count: 43173,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2025.10.18-000017',
          doc_count: 43171,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.internal.alerts-security.alerts-default-000016',
          doc_count: 42760,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'session',
                doc_count: 23726,
              },
              {
                key: 'file',
                doc_count: 11356,
              },
              {
                key: 'network',
                doc_count: 2069,
              },
              {
                key: 'authentication',
                doc_count: 692,
              },
              {
                key: 'database',
                doc_count: 499,
              },
              {
                key: 'configuration',
                doc_count: 437,
              },
              {
                key: 'iam',
                doc_count: 193,
              },
              {
                key: 'api',
                doc_count: 56,
              },
              {
                key: 'host',
                doc_count: 33,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2024.11.22-000005',
          doc_count: 42445,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-azure.eventhub-default-2025.09.30-000008',
          doc_count: 41406,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2025.01.02-000007',
          doc_count: 41231,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 10632,
              },
              {
                key: 'session',
                doc_count: 6289,
              },
              {
                key: 'iam',
                doc_count: 12,
              },
              {
                key: 'process',
                doc_count: 3,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2024.07.25-000001',
          doc_count: 41189,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2024.07.25-000001',
          doc_count: 41189,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2024.09.23-000003',
          doc_count: 41164,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2024.09.23-000003',
          doc_count: 41164,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2024.08.24-000002',
          doc_count: 41162,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2024.08.24-000002',
          doc_count: 41162,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2024.10.23-000004',
          doc_count: 41161,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2024.10.23-000004',
          doc_count: 41161,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-firewall_aws_ec2_security_group-default-2025.09.29-000007',
          doc_count: 39270,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-subnet_gcp_subnet-default-2025.07.31-000006',
          doc_count: 37949,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-subnet_gcp_subnet-default-2025.08.30-000007',
          doc_count: 36583,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2025.01.15-000007',
          doc_count: 36115,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-firewall_aws_ec2_security_group-default-2025.10.29-000008',
          doc_count: 35018,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-firewall_aws_ec2_security_group-default-2025.07.31-000005',
          doc_count: 34660,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.internal.alerts-security.alerts-default-000008',
          doc_count: 34559,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'session',
                doc_count: 32846,
              },
              {
                key: 'configuration',
                doc_count: 752,
              },
              {
                key: 'vulnerability',
                doc_count: 408,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-firewall_aws_ec2_security_group-default-2025.08.30-000006',
          doc_count: 34356,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-subnet_gcp_subnet-default-2025.10.29-000009',
          doc_count: 33896,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_messaging_notification-service_sns-topic-default-2025.04.23-000007',
          doc_count: 33222,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_messaging_notification-service_sns-topic-default-2024.12.05-000001',
          doc_count: 33190,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-firewall_aws_ec2_security_group-default-2025.05.24-000002',
          doc_count: 32716,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.internal.alerts-security.alerts-default-000015',
          doc_count: 32279,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'session',
                doc_count: 23718,
              },
              {
                key: 'file',
                doc_count: 5610,
              },
              {
                key: 'network',
                doc_count: 520,
              },
              {
                key: 'configuration',
                doc_count: 376,
              },
              {
                key: 'iam',
                doc_count: 216,
              },
              {
                key: 'authentication',
                doc_count: 183,
              },
              {
                key: 'database',
                doc_count: 162,
              },
              {
                key: 'api',
                doc_count: 27,
              },
              {
                key: 'host',
                doc_count: 9,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_account_aws_iam_role-default-2025.09.29-000007',
          doc_count: 31722,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-firewall_aws_ec2_security_group-default-2025.06.23-000003',
          doc_count: 30227,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-firewall_aws_ec2_security_group-default-2025.04.24-000001',
          doc_count: 30125,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2024.11.17-000005',
          doc_count: 29485,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_account_aws_iam_role-default-2025.07.31-000005',
          doc_count: 29192,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.internal.alerts-security.alerts-default-000010',
          doc_count: 29120,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'session',
                doc_count: 27424,
              },
              {
                key: 'configuration',
                doc_count: 563,
              },
              {
                key: 'vulnerability',
                doc_count: 415,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_account_aws_iam_role-default-2025.10.29-000008',
          doc_count: 28780,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_account_aws_iam_role-default-2025.08.30-000006',
          doc_count: 28350,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_account_aws_iam_role-default-2025.05.24-000002',
          doc_count: 28006,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2024.12.16-000006',
          doc_count: 27849,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2024.07.25-000001',
          doc_count: 27579,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2024.07.25-000001',
          doc_count: 26979,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 8689,
              },
              {
                key: 'session',
                doc_count: 3109,
              },
              {
                key: 'process',
                doc_count: 26,
              },
            ],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2024.09.18-000003',
          doc_count: 26495,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2024.09.23-000003',
          doc_count: 26299,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 8179,
              },
              {
                key: 'session',
                doc_count: 3156,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_account_aws_iam_role-default-2025.04.24-000001',
          doc_count: 26198,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.internal.alerts-security.alerts-default-000011',
          doc_count: 26066,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'session',
                doc_count: 25173,
              },
              {
                key: 'configuration',
                doc_count: 180,
              },
            ],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2024.10.18-000004',
          doc_count: 25853,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_subnet_gcp-subnet-default-2025.03.24-000005',
          doc_count: 25835,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-gcp.audit-default-2024.12.13-000001',
          doc_count: 24945,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 24603,
              },
              {
                key: 'network',
                doc_count: 24603,
              },
              {
                key: 'session',
                doc_count: 378,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_account_aws_iam_role-default-2025.06.23-000003',
          doc_count: 24804,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.filebeat-default-2024.08.24-000002',
          doc_count: 24603,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.internal.alerts-security.alerts-default-000013',
          doc_count: 24601,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'session',
                doc_count: 23768,
              },
              {
                key: 'configuration',
                doc_count: 341,
              },
            ],
          },
        },
        {
          key: '.internal.alerts-security.alerts-default-000014',
          doc_count: 24597,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'session',
                doc_count: 23722,
              },
              {
                key: 'configuration',
                doc_count: 362,
              },
            ],
          },
        },
        {
          key: '.internal.alerts-security.alerts-default-000012',
          doc_count: 24501,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'session',
                doc_count: 23745,
              },
              {
                key: 'configuration',
                doc_count: 360,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-default-2025.01.24-000001',
          doc_count: 23213,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2024.08.24-000002',
          doc_count: 20907,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 6963,
              },
              {
                key: 'session',
                doc_count: 3164,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_subnet_gcp-subnet-default-2025.02.22-000004',
          doc_count: 20328,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_firewall_ec2-security-group-default-2025.02.22-000004',
          doc_count: 19993,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.latest.security_user_default',
          doc_count: 18137,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-24.security_user_default',
          doc_count: 18079,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.reset.security_user_default',
          doc_count: 18079,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-23.security_user_default',
          doc_count: 18008,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-22.security_user_default',
          doc_count: 17964,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-21.security_user_default',
          doc_count: 17927,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-20.security_user_default',
          doc_count: 17906,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-19.security_user_default',
          doc_count: 17878,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-18.security_user_default',
          doc_count: 17862,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-17.security_user_default',
          doc_count: 17846,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-16.security_user_default',
          doc_count: 17776,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-15.security_user_default',
          doc_count: 17664,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-14.security_user_default',
          doc_count: 17642,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-13.security_user_default',
          doc_count: 17569,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-12.security_user_default',
          doc_count: 17522,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-11.security_user_default',
          doc_count: 17492,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-10.security_user_default',
          doc_count: 17471,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_firewall_ec2-security-group-default-2025.01.23-000003',
          doc_count: 17437,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_messaging_notification-service_sns-topic-default-2025.01.04-000002',
          doc_count: 16590,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.latest.security_generic_default',
          doc_count: 16303,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-24.security_generic_default',
          doc_count: 16297,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.reset.security_generic_default',
          doc_count: 16297,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-23.security_generic_default',
          doc_count: 16287,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-22.security_generic_default',
          doc_count: 16286,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-20.security_generic_default',
          doc_count: 16271,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-21.security_generic_default',
          doc_count: 16271,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-18.security_generic_default',
          doc_count: 16262,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-19.security_generic_default',
          doc_count: 16262,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-17.security_generic_default',
          doc_count: 16099,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-16.security_generic_default',
          doc_count: 16095,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-15.security_generic_default',
          doc_count: 16084,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-14.security_generic_default',
          doc_count: 16075,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-13.security_generic_default',
          doc_count: 16060,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-12.security_generic_default',
          doc_count: 16058,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_firewall_ec2-security-group-default-2025.03.24-000005',
          doc_count: 16023,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-11.security_generic_default',
          doc_count: 15988,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-10.security_generic_default',
          doc_count: 15977,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_role_iam-role-default-2025.02.22-000004',
          doc_count: 15840,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_role_iam-role-default-2025.01.23-000003',
          doc_count: 14256,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-endpoint.events.network-default-2025.03.21-000002',
          doc_count: 13948,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'network',
                doc_count: 13948,
              },
            ],
          },
        },
        {
          key: '.ds-logs-endpoint.events.process-default-2025.03.21-000002',
          doc_count: 13400,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'process',
                doc_count: 13400,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-subnet_gcp_subnet-default-2025.07.22-000005',
          doc_count: 13393,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_role_iam-role-default-2025.03.24-000005',
          doc_count: 13264,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-elastic_agent.endpoint_security-default-2025.03.21-000002',
          doc_count: 12303,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-azure.eventhub-default-2025.10.30-000009',
          doc_count: 12274,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_aws_iam_policy-default-2025.08.30-000006',
          doc_count: 12095,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_aws_iam_policy-default-2025.05.24-000002',
          doc_count: 11944,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.endpoint_security-default-2025.03.21-000002',
          doc_count: 11688,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_aws_iam_policy-default-2025.09.29-000007',
          doc_count: 11670,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-azure.eventhub-default-2025.07.02-000005',
          doc_count: 11504,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_aws_iam_policy-default-2025.04.24-000001',
          doc_count: 11483,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_aws_iam_policy-default-2025.07.31-000005',
          doc_count: 11480,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_status-default-2025.11.17-000018',
          doc_count: 11442,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-system.auth-default-2024.11.22-000005',
          doc_count: 11210,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'authentication',
                doc_count: 3380,
              },
              {
                key: 'session',
                doc_count: 1168,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_messaging_notification-service_sns-topic-default-2025.05.23-000008',
          doc_count: 11074,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-azure.eventhub-default-2025.06.02-000004',
          doc_count: 10816,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_network_interface-default-2025.06.23-000003',
          doc_count: 9478,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_subnet-default-2025.09.29-000007',
          doc_count: 9272,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_aws_iam_policy-default-2025.10.29-000008',
          doc_count: 9231,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_network_interface-default-2025.07.31-000005',
          doc_count: 8690,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.metrics-default-2024.07.28-000001',
          doc_count: 8642,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.metrics-default-2024.08.27-000002',
          doc_count: 8642,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.metrics-default-2024.09.26-000003',
          doc_count: 8642,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.metrics-default-2024.10.26-000004',
          doc_count: 8642,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.metrics-default-2025.03.19-000008',
          doc_count: 8632,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.metrics-default-2024.11.25-000005',
          doc_count: 8623,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_network_interface-default-2025.08.30-000006',
          doc_count: 8530,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-azure.eventhub-default-2025.05.03-000003',
          doc_count: 8390,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_network_interface-default-2025.09.29-000007',
          doc_count: 8380,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_aws_iam_user-default-2025.09.29-000007',
          doc_count: 8306,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.metrics-default-2025.04.18-000009',
          doc_count: 8294,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_aws_iam_policy-default-2025.06.23-000003',
          doc_count: 8241,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloud_defend-default-2025.03.19-000007',
          doc_count: 8107,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_aws_iam_user-default-2025.07.31-000005',
          doc_count: 8088,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_network_interface-default-2025.05.24-000002',
          doc_count: 8034,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.metrics-default-2025.05.18-000010',
          doc_count: 8021,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_subnet-default-2025.06.23-000003',
          doc_count: 7769,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_aws_iam_user-default-2025.08.30-000006',
          doc_count: 7744,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_subnet-default-2025.05.24-000002',
          doc_count: 7740,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_subnet-default-2025.07.31-000005',
          doc_count: 7708,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_subnet-default-2025.08.30-000006',
          doc_count: 7522,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-azure.eventhub-default-2025.08.01-000006',
          doc_count: 7467,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.metrics-default-2024.12.25-000006',
          doc_count: 7460,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_subnet-default-2025.10.29-000008',
          doc_count: 7370,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_subnet-default-2025.04.24-000001',
          doc_count: 7282,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_aws_iam_user-default-2025.05.24-000002',
          doc_count: 7150,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_network_interface-default-2025.04.24-000001',
          doc_count: 6897,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-storage_bucket_aws_s3_bucket-default-2025.09.29-000007',
          doc_count: 6784,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_policy_iam-policy-default-2025.02.22-000004',
          doc_count: 6667,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_aws_iam_user-default-2025.10.29-000008',
          doc_count: 6634,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.internal.alerts-security.alerts-default-000017',
          doc_count: 6527,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'session',
                doc_count: 6320,
              },
              {
                key: 'configuration',
                doc_count: 96,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-storage_bucket_aws_s3_bucket-default-2025.07.31-000005',
          doc_count: 6516,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_aws_iam_user-default-2025.04.24-000001',
          doc_count: 6507,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-storage_bucket_aws_s3_bucket-default-2025.08.30-000006',
          doc_count: 6338,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_aws_ec2_instance-default-2025.06.23-000003',
          doc_count: 6321,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_policy_iam-policy-default-2025.01.23-000003',
          doc_count: 6300,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_aws_iam_user-default-2025.06.23-000003',
          doc_count: 6247,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_aws_ec2_instance-default-2025.07.31-000005',
          doc_count: 6182,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-storage_bucket_aws_s3_bucket-default-2025.10.29-000008',
          doc_count: 6170,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_firewall_ec2-security-group-default-2025.06.23-000009',
          doc_count: 6023,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_aws_ec2_instance-default-2025.08.30-000006',
          doc_count: 6010,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-storage_bucket_aws_s3_bucket-default-2025.05.24-000002',
          doc_count: 6010,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_interface_ec2-network-interface-default-2025.02.22-000004',
          doc_count: 5967,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_policy_iam-policy-default-2025.03.24-000005',
          doc_count: 5886,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-storage_bucket_aws_s3_bucket-default-2025.04.24-000001',
          doc_count: 5866,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2024.07.25-000001',
          doc_count: 5813,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_network_interface-default-2025.10.29-000008',
          doc_count: 5694,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_messaging_notification-service_sns-topic-default-2025.07.23-000010',
          doc_count: 5537,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_aws_ec2_instance-default-2025.05.24-000002',
          doc_count: 5499,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_subnet_ec2-subnet-default-2025.02.22-000004',
          doc_count: 5425,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_gcp_service_account_key-default-2025.06.22-000004',
          doc_count: 5373,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-storage_bucket_aws_s3_bucket-default-2025.06.23-000003',
          doc_count: 5102,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_gcp_service_account_key-default-2025.09.29-000008',
          doc_count: 5097,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_subnet_gcp-subnet-default-2024.12.05-000001',
          doc_count: 4981,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_role_iam-role-default-2025.06.23-000009',
          doc_count: 4947,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-gcp.audit-default-2025.01.12-000002',
          doc_count: 4797,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 4791,
              },
              {
                key: 'network',
                doc_count: 4791,
              },
              {
                key: 'session',
                doc_count: 7,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_aws_ec2_instance-default-2025.09.29-000007',
          doc_count: 4772,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-firewall_aws_ec2_security_group-default-2025.07.23-000004',
          doc_count: 4577,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_aws_ec2_instance-default-2025.04.24-000001',
          doc_count: 4569,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_gcp_service_account_key-default-2025.07.31-000006',
          doc_count: 4551,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_subnet_ec2-subnet-default-2025.01.23-000003',
          doc_count: 4541,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2024.09.18-000003',
          doc_count: 4533,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_gcp_service_account_key-default-2025.08.30-000007',
          doc_count: 4386,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2024.10.18-000004',
          doc_count: 4379,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_interface_ec2-network-interface-default-2025.01.23-000003',
          doc_count: 4355,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_gcp_service_account_key-default-2025.05.23-000003',
          doc_count: 4283,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_gcp_service_account_key-default-2025.10.29-000009',
          doc_count: 4268,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_interface_ec2-network-interface-default-2025.03.24-000005',
          doc_count: 4074,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_gcp_service_account_key-default-2025.04.23-000002',
          doc_count: 3993,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_subnet_ec2-subnet-default-2025.03.24-000005',
          doc_count: 3961,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_user_iam-user-default-2025.02.22-000004',
          doc_count: 3942,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_account_aws_iam_role-default-2025.07.23-000004',
          doc_count: 3942,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_virtual-machine_ec2-instance-default-2025.02.22-000004',
          doc_count: 3861,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
          doc_count: 3743,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'process',
                doc_count: 3566,
              },
              {
                key: 'unknown',
                doc_count: 99,
              },
              {
                key: 'authentication',
                doc_count: 62,
              },
              {
                key: 'session',
                doc_count: 9,
              },
              {
                key: 'file',
                doc_count: 5,
              },
              {
                key: 'configuration',
                doc_count: 2,
              },
              {
                key: 'host',
                doc_count: 1,
              },
              {
                key: 'network',
                doc_count: 1,
              },
            ],
          },
        },
        {
          key: '.ds-logs-elastic_agent.metricbeat-default-2024.08.24-000002',
          doc_count: 3694,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_storage_object-storage_s3-bucket-default-2025.02.22-000004',
          doc_count: 3582,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_firewall_ec2-security-group-default-2024.12.05-000001',
          doc_count: 3516,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_gcp_service_account-default-2025.06.22-000004',
          doc_count: 3470,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_user_iam-user-default-2025.01.23-000003',
          doc_count: 3432,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_user_iam-user-default-2025.03.24-000005',
          doc_count: 3429,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.internal.preview.alerts-security.alerts-default-000002',
          doc_count: 3220,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'file',
                doc_count: 1876,
              },
              {
                key: 'network',
                doc_count: 403,
              },
              {
                key: 'iam',
                doc_count: 225,
              },
              {
                key: 'database',
                doc_count: 143,
              },
              {
                key: 'authentication',
                doc_count: 107,
              },
              {
                key: 'configuration',
                doc_count: 32,
              },
              {
                key: 'host',
                doc_count: 11,
              },
              {
                key: 'api',
                doc_count: 7,
              },
              {
                key: 'vulnerability',
                doc_count: 6,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_aws_ec2_instance-default-2025.10.29-000008',
          doc_count: 3212,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_storage_object-storage_s3-bucket-default-2025.03.24-000005',
          doc_count: 3142,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_firewall_ec2-security-group-default-2025.04.23-000007',
          doc_count: 3102,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_storage_object-storage_s3-bucket-default-2025.01.23-000003',
          doc_count: 3096,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_network_acl-default-2025.09.29-000007',
          doc_count: 3092,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_gcp_service_account-default-2025.09.29-000008',
          doc_count: 2974,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_vpc-default-2025.09.29-000007',
          doc_count: 2964,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_virtual-machine_ec2-instance-default-2025.01.23-000003',
          doc_count: 2893,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_role_iam-role-default-2024.12.05-000001',
          doc_count: 2885,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.heartbeat-default-2024.07.28-000001',
          doc_count: 2882,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.heartbeat-default-2024.09.26-000003',
          doc_count: 2882,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.heartbeat-default-2024.10.26-000004',
          doc_count: 2882,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.heartbeat-default-2024.08.27-000002',
          doc_count: 2880,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.heartbeat-default-2024.11.25-000005',
          doc_count: 2880,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.heartbeat-default-2025.03.19-000008',
          doc_count: 2876,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.heartbeat-default-2025.04.18-000009',
          doc_count: 2865,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_gcp_service_account-default-2025.05.23-000003',
          doc_count: 2853,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_network_acl-default-2025.07.31-000005',
          doc_count: 2788,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_gcp_service_account-default-2025.07.31-000006',
          doc_count: 2766,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_virtual-machine_ec2-instance-default-2025.03.24-000005',
          doc_count: 2754,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_role_iam-role-default-2025.04.23-000007',
          doc_count: 2708,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_network_acl-default-2025.08.30-000006',
          doc_count: 2708,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_gcp_service_account-default-2025.04.23-000002',
          doc_count: 2707,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.heartbeat-default-2025.05.18-000010',
          doc_count: 2673,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_vpc-default-2025.07.31-000005',
          doc_count: 2664,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_subnet_gcp-subnet-default-2025.01.23-000003',
          doc_count: 2662,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_network_acl-default-2025.05.24-000002',
          doc_count: 2660,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_network_acl-default-2025.10.29-000008',
          doc_count: 2630,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-storage_bucket_azure_storage_blob_container-default-2025.10.09-000007',
          doc_count: 2608,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_gcp_service_account-default-2025.08.30-000007',
          doc_count: 2588,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_vpc-default-2025.08.30-000006',
          doc_count: 2588,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-storage_bucket_azure_storage_blob_container-default-2025.08.10-000005',
          doc_count: 2579,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-azure.eventhub-default-2025.08.31-000007',
          doc_count: 2578,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_vpc-default-2025.05.24-000002',
          doc_count: 2540,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_network_acl-default-2025.04.24-000001',
          doc_count: 2538,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-storage_bucket_azure_storage_blob_container-default-2025.09.09-000006',
          doc_count: 2520,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_vpc-default-2025.10.29-000008',
          doc_count: 2514,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: 'logs-cloud_security_posture.findings_latest-default',
          doc_count: 2505,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 2505,
              },
            ],
          },
        },
        {
          key: '.ds-metrics-cloud_defend.heartbeat-default-2024.12.25-000006',
          doc_count: 2485,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_service-identity_service-account-key_gcp-service-account-key-default-2025.03.24-000005',
          doc_count: 2484,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_virtual-machine_gcp-instance-default-2025.06.23-000009',
          doc_count: 2477,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_network_acl-default-2025.06.23-000003',
          doc_count: 2467,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-gateway_aws_internet_gateway-default-2025.09.29-000007',
          doc_count: 2452,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_gcp_service_account-default-2025.10.29-000009',
          doc_count: 2447,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_vpc-default-2025.06.23-000003',
          doc_count: 2367,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_vpc-default-2025.04.24-000001',
          doc_count: 2336,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: 'security_solution-cloud_security_posture.misconfiguration_latest-v1',
          doc_count: 2259,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 2259,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-gateway_aws_internet_gateway-default-2025.07.31-000005',
          doc_count: 2168,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-gateway_aws_internet_gateway-default-2025.05.24-000002',
          doc_count: 2120,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-gateway_aws_internet_gateway-default-2025.08.30-000006',
          doc_count: 2106,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-gateway_aws_internet_gateway-default-2025.10.29-000008',
          doc_count: 2050,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-storage_bucket_azure_storage_blob_container-default-2025.06.23-000003',
          doc_count: 2050,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-gateway_aws_internet_gateway-default-2025.04.24-000001',
          doc_count: 2016,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-storage_bucket_azure_storage_blob_container-default-2025.04.24-000001',
          doc_count: 2015,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-gateway_aws_internet_gateway-default-2025.06.23-000003',
          doc_count: 1984,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-storage_bucket_azure_storage_blob_container-default-2025.05.24-000002',
          doc_count: 1885,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_interface_ec2-network-interface-default-2025.06.23-000009',
          doc_count: 1874,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_subnet_gcp-subnet-default-2025.06.23-000009',
          doc_count: 1750,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_virtual-machine_gcp-instance-default-2025.03.24-000005',
          doc_count: 1742,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_service-identity_service-account_gcp-service-account-default-2025.03.24-000005',
          doc_count: 1719,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-subnet_gcp_subnet-default-2025.04.22-000001',
          doc_count: 1694,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_authorization_acl_s3-access-control-list-default-2025.02.22-000004',
          doc_count: 1689,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_aws_iam_policy-default-2025.07.23-000004',
          doc_count: 1640,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_virtual-network_vpc-default-2025.02.22-000004',
          doc_count: 1615,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_azure_resource_group-default-2025.10.09-000008',
          doc_count: 1563,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_gcp_vpc_network-default-2025.06.23-000003',
          doc_count: 1563,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloud_defend-default-2025.04.18-000008',
          doc_count: 1546,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_subnet_ec2-subnet-default-2025.06.23-000009',
          doc_count: 1540,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-storage_bucket_azure_storage_blob_container-default-2025.11.08-000008',
          doc_count: 1530,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_subnet_gcp-subnet-default-2025.04.23-000007',
          doc_count: 1490,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_authorization_acl_s3-access-control-list-default-2025.01.23-000003',
          doc_count: 1470,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_service-identity_service-account-key_gcp-service-account-key-default-2025.02.22-000004',
          doc_count: 1439,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-faas_aws_lambda_function-default-2025.04.24-000001',
          doc_count: 1424,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_firewall_ec2-security-group-default-2025.01.04-000002',
          doc_count: 1402,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_gateway_internet-gateway-default-2025.02.22-000004',
          doc_count: 1401,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_virtual-network_vpc-default-2025.01.23-000003',
          doc_count: 1400,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_authorization_acl_s3-access-control-list-default-2025.03.24-000005',
          doc_count: 1366,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-auditd_manager.auditd-default-2025.02.19-000001',
          doc_count: 1350,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'process',
                doc_count: 1035,
              },
              {
                key: 'unknown',
                doc_count: 167,
              },
              {
                key: 'authentication',
                doc_count: 138,
              },
              {
                key: 'session',
                doc_count: 7,
              },
              {
                key: 'file',
                doc_count: 3,
              },
              {
                key: 'configuration',
                doc_count: 2,
              },
              {
                key: 'network',
                doc_count: 1,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_azure_resource_group-default-2025.06.22-000004',
          doc_count: 1341,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-faas_aws_lambda_function-default-2025.05.24-000002',
          doc_count: 1320,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_virtual-network_vpc-default-2025.03.24-000005',
          doc_count: 1304,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_gcp_service_account_key-default-2025.07.22-000005',
          doc_count: 1295,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_policy_iam-policy-default-2024.12.05-000001',
          doc_count: 1293,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_subnet_gcp-subnet-default-2025.01.04-000002',
          doc_count: 1290,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-volume_azure_disk-default-2025.06.22-000004',
          doc_count: 1272,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_virtual-machine_ec2-instance-default-2025.06.23-000009',
          doc_count: 1250,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_azure_resource_group-default-2025.09.09-000007',
          doc_count: 1249,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_virtual-machine_gcp-instance-default-2025.05.23-000008',
          doc_count: 1234,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_gateway_internet-gateway-default-2025.01.23-000003',
          doc_count: 1218,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_network_interface-default-2025.07.23-000004',
          doc_count: 1217,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-volume_azure_disk-default-2025.10.09-000008',
          doc_count: 1206,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_gcp_vpc_network-default-2025.05.24-000002',
          doc_count: 1205,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_policy_iam-policy-default-2025.06.23-000009',
          doc_count: 1200,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_gcp_vpc_network-default-2025.04.24-000001',
          doc_count: 1200,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_role_iam-role-default-2025.01.04-000002',
          doc_count: 1192,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_policy_iam-policy-default-2025.04.23-000007',
          doc_count: 1184,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-faas_aws_lambda_function-default-2025.06.23-000003',
          doc_count: 1150,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_user_iam-user-default-2025.06.23-000009',
          doc_count: 1144,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_azure_resource_group-default-2025.08.10-000006',
          doc_count: 1132,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_azure_virtual_machine-default-2025.06.22-000004',
          doc_count: 1117,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_gcp_vpc_network-default-2025.09.29-000007',
          doc_count: 1092,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_gateway_internet-gateway-default-2025.03.24-000005',
          doc_count: 1087,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-volume_azure_disk-default-2025.09.09-000007',
          doc_count: 1074,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_subnet-default-2025.07.23-000004',
          doc_count: 1060,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_azure_virtual_machine-default-2025.10.09-000008',
          doc_count: 1051,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_aws_iam_user-default-2025.07.23-000004',
          doc_count: 1045,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_storage_object-storage_s3-bucket-default-2025.06.23-000009',
          doc_count: 1018,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_service-identity_service-account_gcp-service-account-default-2025.02.22-000004',
          doc_count: 1011,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-volume_azure_disk-default-2025.08.10-000006',
          doc_count: 1007,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_gcp_compute_instance-default-2025.06.22-000004',
          doc_count: 1001,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_azure_resource_group-default-2025.05.23-000003',
          doc_count: 1000,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_virtual-machine_gcp-instance-default-2025.04.23-000007',
          doc_count: 988,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_azure_resource_group-default-2025.04.23-000002',
          doc_count: 986,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-gateway_aws_nat_gateway-default-2025.09.29-000007',
          doc_count: 982,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_subnet_ec2-subnet-default-2024.12.05-000001',
          doc_count: 982,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-volume_azure_disk-default-2025.05.23-000003',
          doc_count: 971,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-volume_azure_disk-default-2025.04.23-000002',
          doc_count: 949,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_interface_ec2-network-interface-default-2024.12.05-000001',
          doc_count: 944,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_azure_virtual_machine-default-2025.09.09-000007',
          doc_count: 924,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_firewall_gcp-firewall-default-2025.03.24-000005',
          doc_count: 922,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-firewall_gcp_firewall-default-2025.06.22-000004',
          doc_count: 910,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.internal.alerts-stack.alerts-default-000016',
          doc_count: 909,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_management_resource-group_azure-resource-group-default-2025.03.24-000005',
          doc_count: 888,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_subnet_gcp-subnet-default-2025.05.23-000008',
          doc_count: 875,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_gcp_vpc_network-default-2025.07.31-000005',
          doc_count: 874,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_gcp_compute_instance-default-2025.09.29-000008',
          doc_count: 870,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-firewall_gcp_firewall-default-2025.05.23-000003',
          doc_count: 854,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_azure_virtual_machine-default-2025.08.10-000006',
          doc_count: 852,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_storage_disk_azure-disk-default-2025.03.24-000005',
          doc_count: 852,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_gcp_vpc_network-default-2025.08.30-000006',
          doc_count: 845,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-gateway_aws_nat_gateway-default-2025.06.23-000003',
          doc_count: 842,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_azure_resource_group-default-2025.11.08-000009',
          doc_count: 841,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_aws_ec2_instance-default-2025.07.23-000004',
          doc_count: 840,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-storage_bucket_aws_s3_bucket-default-2025.07.23-000004',
          doc_count: 840,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-firewall_gcp_firewall-default-2025.07.31-000006',
          doc_count: 834,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-firewall_gcp_firewall-default-2025.09.29-000008',
          doc_count: 832,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-access_management_gcp_service_account-default-2025.07.22-000005',
          doc_count: 824,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_azure_virtual_machine-default-2025.05.23-000003',
          doc_count: 803,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_interface_ec2-network-interface-default-2025.04.23-000007',
          doc_count: 796,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-firewall_gcp_firewall-default-2025.04.23-000002',
          doc_count: 783,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_gcp_vpc_network-default-2025.10.29-000008',
          doc_count: 782,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-firewall_gcp_firewall-default-2025.08.30-000007',
          doc_count: 780,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.latest.security_host_default',
          doc_count: 778,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-24.security_host_default',
          doc_count: 776,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.reset.security_host_default',
          doc_count: 776,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-22.security_host_default',
          doc_count: 773,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-23.security_host_default',
          doc_count: 773,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_azure_virtual_machine-default-2025.04.23-000002',
          doc_count: 769,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-20.security_host_default',
          doc_count: 769,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-21.security_host_default',
          doc_count: 769,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-18.security_host_default',
          doc_count: 766,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-19.security_host_default',
          doc_count: 766,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_gcp_compute_instance-default-2025.04.23-000002',
          doc_count: 756,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-17.security_host_default',
          doc_count: 753,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-16.security_host_default',
          doc_count: 752,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_subnet_ec2-subnet-default-2025.04.23-000007',
          doc_count: 750,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-15.security_host_default',
          doc_count: 749,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-14.security_host_default',
          doc_count: 748,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-12.security_host_default',
          doc_count: 744,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-13.security_host_default',
          doc_count: 744,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-firewall_gcp_firewall-default-2025.10.29-000009',
          doc_count: 741,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-gateway_aws_nat_gateway-default-2025.05.24-000002',
          doc_count: 740,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-11.security_host_default',
          doc_count: 739,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-gateway_aws_nat_gateway-default-2025.07.31-000005',
          doc_count: 736,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.entities.v1.history.2025-11-10.security_host_default',
          doc_count: 733,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-gateway_aws_nat_gateway-default-2025.08.30-000006',
          doc_count: 726,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-gateway_aws_nat_gateway-default-2025.10.29-000008',
          doc_count: 718,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_management_resource-group_azure-resource-group-default-2025.02.22-000004',
          doc_count: 713,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.internal.alerts-security.alerts-default-000007',
          doc_count: 707,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 434,
              },
              {
                key: 'vulnerability',
                doc_count: 273,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_service-identity_service-account-key_gcp-service-account-key-default-2025.06.23-000009',
          doc_count: 699,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_storage_disk_azure-disk-default-2025.02.22-000004',
          doc_count: 691,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_virtual-machine_azure-virtual-machine-default-2025.03.24-000005',
          doc_count: 684,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_user_iam-user-default-2025.04.23-000007',
          doc_count: 676,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-gateway_aws_nat_gateway-default-2025.04.24-000001',
          doc_count: 658,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_gcp_compute_instance-default-2025.08.30-000007',
          doc_count: 656,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_service-identity_service-account-key_gcp-service-account-key-default-2025.04.23-000007',
          doc_count: 656,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_gcp_compute_instance-default-2025.10.29-000009',
          doc_count: 635,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_gcp_compute_instance-default-2025.07.31-000006',
          doc_count: 625,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_virtual-machine_ec2-instance-default-2024.12.05-000001',
          doc_count: 625,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_user_iam-user-default-2024.12.05-000001',
          doc_count: 618,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_storage_object-storage_s3-bucket-default-2025.04.23-000007',
          doc_count: 618,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloud_defend-default-2024.12.16-000004',
          doc_count: 608,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-volume_azure_disk-default-2025.11.08-000009',
          doc_count: 600,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.endpoint_security-default-2025.02.19-000001',
          doc_count: 595,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-faas_aws_lambda_function-default-2025.09.29-000007',
          doc_count: 576,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_virtual-machine_azure-virtual-machine-default-2025.02.22-000004',
          doc_count: 565,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-faas_aws_lambda_function-default-2025.07.31-000005',
          doc_count: 558,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_firewall_ec2-security-group-default-2025.07.23-000010',
          doc_count: 558,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_gateway_nat-gateway-default-2025.02.22-000004',
          doc_count: 551,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_virtual-machine_ec2-instance-default-2025.04.23-000007',
          doc_count: 542,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-faas_aws_lambda_function-default-2025.08.30-000006',
          doc_count: 540,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_firewall_ec2-security-group-default-2025.05.23-000008',
          doc_count: 539,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_policy_iam-policy-default-2025.01.04-000002',
          doc_count: 534,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_gcp_compute_instance-default-2025.05.23-000003',
          doc_count: 527,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-faas_aws_lambda_function-default-2025.10.29-000008',
          doc_count: 522,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-kubernetes.event-default-2025.10.18-000001',
          doc_count: 513,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloud_defend-default-2024.12.03-000003',
          doc_count: 512,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-host_azure_virtual_machine-default-2025.11.08-000009',
          doc_count: 510,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_serverless_lambda-function-default-2025.03.24-000005',
          doc_count: 504,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.internal.preview.alerts-security.alerts-default-000003',
          doc_count: 500,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'iam',
                doc_count: 71,
              },
              {
                key: 'network',
                doc_count: 31,
              },
              {
                key: 'database',
                doc_count: 29,
              },
              {
                key: 'api',
                doc_count: 7,
              },
              {
                key: 'authentication',
                doc_count: 5,
              },
              {
                key: 'configuration',
                doc_count: 4,
              },
              {
                key: 'file',
                doc_count: 1,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_authorization_acl_s3-access-control-list-default-2025.06.23-000009',
          doc_count: 491,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_role_iam-role-default-2025.07.23-000010',
          doc_count: 472,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_virtual-network_vpc-default-2025.06.23-000009',
          doc_count: 471,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_role_iam-role-default-2025.05.23-000008',
          doc_count: 469,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_serverless_lambda-function-default-2025.02.22-000004',
          doc_count: 465,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_firewall_gcp-firewall-default-2025.06.23-000009',
          doc_count: 460,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_storage_object-storage_gcp-bucket-default-2025.03.24-000005',
          doc_count: 454,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_firewall_gcp-firewall-default-2025.04.23-000007',
          doc_count: 448,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-file_system_service_azure_storage_file_service-default-2025.04.24-000001',
          doc_count: 434,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-messaging_service_azure_storage_queue_service-default-2025.04.23-000002',
          doc_count: 434,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_usage_technology_azure_storage_blob_service-default-2025.04.24-000001',
          doc_count: 434,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_usage_technology_azure_storage_table_service-default-2025.04.24-000001',
          doc_count: 434,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-private_endpoint_azure_storage_account-default-2025.04.23-000002',
          doc_count: 420,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_gateway_nat-gateway-default-2025.01.23-000003',
          doc_count: 417,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-messaging_service_azure_storage_queue_service-default-2025.05.23-000003',
          doc_count: 412,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-private_endpoint_azure_storage_account-default-2025.05.23-000003',
          doc_count: 412,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-file_system_service_azure_storage_file_service-default-2025.05.24-000002',
          doc_count: 411,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_usage_technology_azure_storage_blob_service-default-2025.05.24-000002',
          doc_count: 411,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_usage_technology_azure_storage_table_service-default-2025.05.24-000002',
          doc_count: 411,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_storage_object-storage_s3-bucket-default-2024.12.05-000001',
          doc_count: 405,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-file_system_service_azure_storage_file_service-default-2025.06.23-000003',
          doc_count: 403,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-file_system_service_azure_storage_file_service-default-2025.08.10-000005',
          doc_count: 403,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-file_system_service_azure_storage_file_service-default-2025.10.09-000007',
          doc_count: 403,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-messaging_service_azure_storage_queue_service-default-2025.06.22-000004',
          doc_count: 403,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-messaging_service_azure_storage_queue_service-default-2025.08.10-000006',
          doc_count: 403,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-messaging_service_azure_storage_queue_service-default-2025.10.09-000008',
          doc_count: 403,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-private_endpoint_azure_storage_account-default-2025.06.22-000004',
          doc_count: 403,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-private_endpoint_azure_storage_account-default-2025.08.10-000006',
          doc_count: 403,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-private_endpoint_azure_storage_account-default-2025.10.09-000008',
          doc_count: 403,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_usage_technology_azure_storage_blob_service-default-2025.06.23-000003',
          doc_count: 403,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_usage_technology_azure_storage_blob_service-default-2025.08.10-000005',
          doc_count: 403,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_usage_technology_azure_storage_blob_service-default-2025.10.09-000007',
          doc_count: 403,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_usage_technology_azure_storage_table_service-default-2025.06.23-000003',
          doc_count: 403,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_usage_technology_azure_storage_table_service-default-2025.08.10-000005',
          doc_count: 403,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_usage_technology_azure_storage_table_service-default-2025.10.09-000007',
          doc_count: 403,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_gateway_internet-gateway-default-2025.06.23-000009',
          doc_count: 394,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-file_system_service_azure_storage_file_service-default-2025.09.09-000006',
          doc_count: 391,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-messaging_service_azure_storage_queue_service-default-2025.09.09-000007',
          doc_count: 391,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-private_endpoint_azure_storage_account-default-2025.09.09-000007',
          doc_count: 391,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_usage_technology_azure_storage_blob_service-default-2025.09.09-000006',
          doc_count: 391,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_usage_technology_azure_storage_table_service-default-2025.09.09-000006',
          doc_count: 391,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-elastic_agent.cloud_defend-default-2025.01.15-000005',
          doc_count: 381,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_virtual-machine_gcp-instance-default-2025.02.22-000004',
          doc_count: 375,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_gateway_nat-gateway-default-2025.03.24-000005',
          doc_count: 375,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_ec2_network_acl-default-2025.07.23-000004',
          doc_count: 370,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_application-integration_message-queue_azure-storage-queue-service-default-2025.03.24-000004',
          doc_count: 369,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_storage_object-storage_azure-storage-blob-service-default-2025.03.24-000004',
          doc_count: 369,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_storage_storage_azure-storage-account-default-2025.03.24-000005',
          doc_count: 369,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_aws_vpc-default-2025.07.23-000004',
          doc_count: 354,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_service-identity_service-account-key_gcp-service-account-key-default-2025.05.23-000008',
          doc_count: 349,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_service-identity_service-account_gcp-service-account-default-2025.06.23-000009',
          doc_count: 347,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_subnet_ec2-subnet-default-2025.01.04-000002',
          doc_count: 336,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_service-identity_service-account_gcp-service-account-default-2025.04.23-000007',
          doc_count: 329,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_authorization_acl_s3-access-control-list-default-2024.12.05-000001',
          doc_count: 317,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-networking_gcp_vpc_network-default-2025.07.23-000004',
          doc_count: 310,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_virtual-network_vpc-default-2024.12.05-000001',
          doc_count: 303,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-gateway_aws_internet_gateway-default-2025.07.23-000004',
          doc_count: 290,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_interface_ec2-network-interface-default-2025.01.04-000002',
          doc_count: 289,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-metrics-fleet_server.agent_versions-default-2025.04.21-000010',
          doc_count: 287,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_user_iam-user-default-2025.01.04-000002',
          doc_count: 283,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_storage_storage_azure-storage-account-default-2025.02.22-000004',
          doc_count: 271,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_gateway_internet-gateway-default-2024.12.05-000001',
          doc_count: 268,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_authorization_acl_s3-access-control-list-default-2025.04.23-000007',
          doc_count: 262,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_application-integration_message-queue_azure-storage-queue-service-default-2025.02.22-000003',
          doc_count: 259,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_storage_object-storage_azure-storage-blob-service-default-2025.02.22-000003',
          doc_count: 259,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-database_aws_rds_instance-default-2025.09.29-000007',
          doc_count: 256,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-faas_aws_lambda_event_source_mapping-default-2025.09.29-000007',
          doc_count: 256,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_service-identity_service-account-key_gcp-service-account-key-default-2024.12.05-000001',
          doc_count: 254,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_virtual-network_vpc-default-2025.04.23-000007',
          doc_count: 250,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_storage_object-storage_gcp-bucket-default-2025.06.23-000009',
          doc_count: 249,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-database_aws_rds_instance-default-2025.07.31-000005',
          doc_count: 248,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-faas_aws_lambda_event_source_mapping-default-2025.07.31-000005',
          doc_count: 248,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_storage_object-storage_gcp-bucket-default-2025.04.23-000007',
          doc_count: 246,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_storage_object-storage_s3-bucket-default-2025.01.04-000002',
          doc_count: 243,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.internal.alerts-security.alerts-default-000006',
          doc_count: 241,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 241,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-database_aws_rds_instance-default-2025.05.24-000002',
          doc_count: 240,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-database_aws_rds_instance-default-2025.08.30-000006',
          doc_count: 240,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-faas_aws_lambda_event_source_mapping-default-2025.05.24-000002',
          doc_count: 240,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-faas_aws_lambda_event_source_mapping-default-2025.08.30-000006',
          doc_count: 240,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.internal.alerts-stack.alerts-default-000010',
          doc_count: 239,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-file_system_service_azure_storage_file_service-default-2025.11.08-000008',
          doc_count: 234,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-messaging_service_azure_storage_queue_service-default-2025.11.08-000009',
          doc_count: 234,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-private_endpoint_azure_storage_account-default-2025.11.08-000009',
          doc_count: 234,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_usage_technology_azure_storage_blob_service-default-2025.11.08-000008',
          doc_count: 234,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-service_usage_technology_azure_storage_table_service-default-2025.11.08-000008',
          doc_count: 234,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-endpoint.events.process-default-2025.02.19-000001',
          doc_count: 233,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'process',
                doc_count: 233,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-database_aws_rds_instance-default-2025.10.29-000008',
          doc_count: 232,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-faas_aws_lambda_event_source_mapping-default-2025.04.24-000001',
          doc_count: 232,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-faas_aws_lambda_event_source_mapping-default-2025.10.29-000008',
          doc_count: 232,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_serverless_lambda-function-default-2025.06.23-000009',
          doc_count: 228,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_firewall_gcp-firewall-default-2025.05.23-000008',
          doc_count: 228,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-database_aws_rds_instance-default-2025.04.24-000001',
          doc_count: 224,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-firewall_gcp_firewall-default-2025.07.22-000005',
          doc_count: 220,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_serverless_lambda-function-default-2025.01.23-000003',
          doc_count: 217,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_network_gateway_internet-gateway-default-2025.04.23-000007',
          doc_count: 208,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-infrastructure_compute_virtual-machine_ec2-instance-default-2025.01.04-000002',
          doc_count: 207,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.internal.alerts-security.alerts-default-000005',
          doc_count: 207,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'configuration',
                doc_count: 207,
              },
            ],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-identity_digital-identity_policy_iam-policy-default-2025.07.23-000010',
          doc_count: 205,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-storage_bucket_azure_storage_blob_container-default-2025.07.23-000004',
          doc_count: 201,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-database_aws_rds_instance-default-2025.06.23-000003',
          doc_count: 200,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key: '.ds-logs-cloud_asset_inventory.asset_inventory-faas_aws_lambda_event_source_mapping-default-2025.06.23-000003',
          doc_count: 200,
          by_category: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
      ],
    },
  },
};

export const mock_categories = {
  iam: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 8771615,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 8799813,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 6159948,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 4646951,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.04.02-000010',
      docs: 38,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.03.03-000009',
      docs: 194,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.07.31-000014',
      docs: 8,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.07.01-000013',
      docs: 6,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.06.01-000012',
      docs: 37,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.02.01-000008',
      docs: 84,
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.12.03-000006',
      docs: 83,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 193,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.01.02-000007',
      docs: 12,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 216,
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 225,
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000003',
      docs: 71,
    },
  ],
  file: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 5342531,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 5042710,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 12766707,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 2696465,
    },
    {
      indexName: '.ds-logs-endpoint.events.file-default-2025.03.21-000002',
      docs: 322536,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000009',
      docs: 116159,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 11356,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 5610,
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
      docs: 5,
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 1876,
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.02.19-000001',
      docs: 3,
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000003',
      docs: 1,
    },
    {
      indexName: '.ds-logs-endpoint.events.file-default-2025.02.19-000001',
      docs: 176,
    },
  ],
  network: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 2973017,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 3001441,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 2071194,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 1558897,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.10.02-000010',
      docs: 243742,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000009',
      docs: 2563,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.07.04-000007',
      docs: 170668,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.04.05-000004',
      docs: 161424,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.06.04-000006',
      docs: 140326,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.08.03-000008',
      docs: 120418,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.09.02-000009',
      docs: 109780,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.03.06-000003',
      docs: 105889,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.05.05-000005',
      docs: 104298,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.11.01-000011',
      docs: 77875,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 2069,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 520,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2024.12.13-000001',
      docs: 24603,
    },
    {
      indexName: '.ds-logs-endpoint.events.network-default-2025.03.21-000002',
      docs: 13948,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.01.12-000002',
      docs: 4791,
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
      docs: 1,
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 403,
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.02.19-000001',
      docs: 1,
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000003',
      docs: 31,
    },
  ],
  database: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 772074,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 788134,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 543918,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 404895,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 499,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 162,
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 143,
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000003',
      docs: 29,
    },
  ],
  authentication: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 724692,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 625117,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 470127,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 403374,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.04.02-000010',
      docs: 227238,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.09.29-000016',
      docs: 328011,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.08.30-000015',
      docs: 218297,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.03.03-000009',
      docs: 210926,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.07.31-000014',
      docs: 123301,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.05.02-000011',
      docs: 181757,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.07.01-000013',
      docs: 105658,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.10.29-000017',
      docs: 169431,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.06.01-000012',
      docs: 164818,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000009',
      docs: 2,
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.10.23-000004',
      docs: 33938,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.02.01-000008',
      docs: 18606,
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.12.03-000006',
      docs: 13917,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 692,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.01.02-000007',
      docs: 10632,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 183,
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.07.25-000001',
      docs: 8689,
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.09.23-000003',
      docs: 8179,
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.08.24-000002',
      docs: 6963,
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.11.22-000005',
      docs: 3380,
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
      docs: 62,
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 107,
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.02.19-000001',
      docs: 138,
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000003',
      docs: 5,
    },
  ],
  host: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 379064,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 357609,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 250363,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 202196,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 33,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 9,
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
      docs: 1,
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 11,
    },
  ],
  configuration: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 77469,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 80559,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 55269,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 40805,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.10.02-000010',
      docs: 243742,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.findings-default-2025.05.08-000015',
      docs: 197746,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.findings-default-2025.06.07-000018',
      docs: 186179,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000009',
      docs: 825,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.07.04-000007',
      docs: 170668,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.findings-default-2025.09.28-000025',
      docs: 169503,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.findings-default-2025.07.30-000021',
      docs: 168901,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.04.05-000004',
      docs: 161424,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.findings-default-2025.08.29-000023',
      docs: 157900,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.06.04-000006',
      docs: 140326,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.findings-default-2025.07.07-000020',
      docs: 130873,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.08.03-000008',
      docs: 120418,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.findings-default-2025.10.28-000027',
      docs: 119442,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.09.02-000009',
      docs: 109780,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.03.06-000003',
      docs: 105889,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.05.05-000005',
      docs: 104298,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.11.01-000011',
      docs: 77875,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 437,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000008',
      docs: 752,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 376,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000010',
      docs: 563,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000011',
      docs: 180,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2024.12.13-000001',
      docs: 24603,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000013',
      docs: 341,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000014',
      docs: 362,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000012',
      docs: 360,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.01.12-000002',
      docs: 4791,
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
      docs: 2,
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 32,
    },
    {
      indexName: 'logs-cloud_security_posture.findings_latest-default',
      docs: 2505,
    },
    {
      indexName: 'security_solution-cloud_security_posture.misconfiguration_latest-v1',
      docs: 2386,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000017',
      docs: 24,
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.02.19-000001',
      docs: 2,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000007',
      docs: 434,
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000003',
      docs: 4,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000006',
      docs: 241,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000005',
      docs: 207,
    },
  ],
  api: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 55900,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 66146,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 41919,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 28195,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 56,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 27,
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 7,
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000003',
      docs: 7,
    },
  ],
  package: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 443,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 405,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 291,
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 243,
    },
  ],
  vulnerability: [
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.09.28-000016',
      docs: 1970313,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.08.29-000015',
      docs: 1859262,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.07.30-000014',
      docs: 1775640,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.10.28-000017',
      docs: 1549412,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.03.04-000009',
      docs: 1490554,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.07.02-000013',
      docs: 1463291,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.05.03-000011',
      docs: 1459683,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.06.02-000012',
      docs: 1451480,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.04.03-000010',
      docs: 1418453,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.02.02-000008',
      docs: 1400155,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.01.03-000007',
      docs: 1219975,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.12.04-000006',
      docs: 1149735,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.10.23-000004',
      docs: 820089,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.09.23-000003',
      docs: 340004,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.07.25-000001',
      docs: 323449,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000009',
      docs: 741,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.08.24-000002',
      docs: 129858,
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.11.22-000005',
      docs: 118810,
    },
    {
      indexName: 'logs-cloud_security_posture.vulnerabilities_latest-default',
      docs: 102183,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000008',
      docs: 408,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000010',
      docs: 415,
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 6,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000007',
      docs: 273,
    },
  ],
  process: [
    {
      indexName: '.ds-logs-cloud_defend.process-default-2024.09.26-000003',
      docs: 1925868,
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2024.10.26-000004',
      docs: 1925486,
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2024.08.27-000002',
      docs: 1924930,
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2024.12.16-000006',
      docs: 1888873,
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2024.07.28-000001',
      docs: 1886247,
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2025.03.19-000009',
      docs: 1444716,
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2025.04.18-000010',
      docs: 1438728,
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2025.05.18-000011',
      docs: 1343644,
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2024.11.25-000005',
      docs: 1307911,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.04.02-000010',
      docs: 100,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.03.03-000009',
      docs: 50,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.07.01-000013',
      docs: 120,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.06.01-000012',
      docs: 2,
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2025.01.15-000007',
      docs: 306217,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000009',
      docs: 10803,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.02.01-000008',
      docs: 1,
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.12.03-000006',
      docs: 93,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.01.02-000007',
      docs: 3,
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.07.25-000001',
      docs: 26,
    },
    {
      indexName: '.ds-logs-endpoint.events.process-default-2025.03.21-000002',
      docs: 13400,
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
      docs: 3566,
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.02.19-000001',
      docs: 1035,
    },
    {
      indexName: '.ds-logs-endpoint.events.process-default-2025.02.19-000001',
      docs: 233,
    },
  ],
  session: [
    {
      indexName: '.ds-logs-system.auth-default-2025.04.02-000010',
      docs: 49439,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.09.29-000016',
      docs: 26872,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.08.30-000015',
      docs: 26898,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.03.03-000009',
      docs: 53010,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.07.31-000014',
      docs: 26874,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.05.02-000011',
      docs: 26896,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.07.01-000013',
      docs: 26940,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.10.29-000017',
      docs: 18928,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.06.01-000012',
      docs: 29221,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.10.02-000010',
      docs: 3055,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000009',
      docs: 51061,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.07.04-000007',
      docs: 4605,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.04.05-000004',
      docs: 4563,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.06.04-000006',
      docs: 3287,
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.10.23-000004',
      docs: 3112,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.08.03-000008',
      docs: 3606,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.09.02-000009',
      docs: 2669,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.03.06-000003',
      docs: 2994,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.05.05-000005',
      docs: 2587,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.11.01-000011',
      docs: 1815,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.02.01-000008',
      docs: 13468,
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.12.03-000006',
      docs: 4050,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 23726,
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.01.02-000007',
      docs: 6289,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000008',
      docs: 32846,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 23718,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000010',
      docs: 27424,
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.07.25-000001',
      docs: 3109,
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.09.23-000003',
      docs: 3156,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000011',
      docs: 25173,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2024.12.13-000001',
      docs: 378,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000013',
      docs: 23768,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000014',
      docs: 23722,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000012',
      docs: 23745,
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.08.24-000002',
      docs: 3164,
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.11.22-000005',
      docs: 1168,
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.01.12-000002',
      docs: 7,
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
      docs: 9,
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000017',
      docs: 1548,
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.02.19-000001',
      docs: 7,
    },
  ],
  unknown: [
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
      docs: 99,
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.02.19-000001',
      docs: 167,
    },
  ],
};
