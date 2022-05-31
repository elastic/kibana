/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  HostDetailsStrategyResponse,
  HostsQueries,
} from '@kbn/security-solution-plugin/common/search_strategy';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const bsearch = getService('bsearch');

  describe('Host Details', () => {
    describe('With filebeat', () => {
      before(
        async () => await esArchiver.load('x-pack/test/functional/es_archives/filebeat/default')
      );
      after(
        async () => await esArchiver.unload('x-pack/test/functional/es_archives/filebeat/default')
      );

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';
      const expectedResult = {
        isPartial: false,
        isRunning: false,
        rawResponse: {
          took: 12,
          timed_out: false,
          _shards: {
            total: 1,
            successful: 1,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: 6157,
            max_score: null,
            hits: [],
          },
          aggregations: {
            cloud_instance_id: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [],
            },
            host_mac: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [],
            },
            host_ip: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: '151.205.0.17',
                  doc_count: 1,
                  timestamp: {
                    value: 1549766627000,
                    value_as_string: '2019-02-10T02:43:47.000Z',
                  },
                },
              ],
            },
            cloud_machine_type: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [],
            },
            cloud_region: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [],
            },
            host_os_version: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: '9 (stretch)',
                  doc_count: 6157,
                  timestamp: {
                    value: 1549767613001,
                    value_as_string: '2019-02-10T03:00:13.001Z',
                  },
                },
              ],
            },
            host_architecture: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'armv7l',
                  doc_count: 6157,
                  timestamp: {
                    value: 1549767613001,
                    value_as_string: '2019-02-10T03:00:13.001Z',
                  },
                },
              ],
            },
            cloud_provider: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [],
            },
            host_os_platform: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'raspbian',
                  doc_count: 6157,
                  timestamp: {
                    value: 1549767613001,
                    value_as_string: '2019-02-10T03:00:13.001Z',
                  },
                },
              ],
            },
            host_os_name: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'Raspbian GNU/Linux',
                  doc_count: 6157,
                  timestamp: {
                    value: 1549767613001,
                    value_as_string: '2019-02-10T03:00:13.001Z',
                  },
                },
              ],
            },
            host_os_family: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: '',
                  doc_count: 6157,
                  timestamp: {
                    value: 1549767613001,
                    value_as_string: '2019-02-10T03:00:13.001Z',
                  },
                },
              ],
            },
            host_name: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'raspberrypi',
                  doc_count: 6157,
                  timestamp: {
                    value: 1549767613001,
                    value_as_string: '2019-02-10T03:00:13.001Z',
                  },
                },
              ],
            },
            host_id: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'b19a781f683541a7a25ee345133aa399',
                  doc_count: 6157,
                  timestamp: {
                    value: 1549767613001,
                    value_as_string: '2019-02-10T03:00:13.001Z',
                  },
                },
              ],
            },
          },
        },
        total: 1,
        loaded: 1,
        inspect: {
          dsl: [
            '{\n  "allowNoIndices": true,\n  "index": [\n    "filebeat-*"\n  ],\n  "ignoreUnavailable": true,\n  "body": {\n    "aggregations": {\n      "host_architecture": {\n        "terms": {\n          "field": "host.architecture",\n          "size": 10,\n          "order": {\n            "timestamp": "desc"\n          }\n        },\n        "aggs": {\n          "timestamp": {\n            "max": {\n              "field": "@timestamp"\n            }\n          }\n        }\n      },\n      "host_id": {\n        "terms": {\n          "field": "host.id",\n          "size": 10,\n          "order": {\n            "timestamp": "desc"\n          }\n        },\n        "aggs": {\n          "timestamp": {\n            "max": {\n              "field": "@timestamp"\n            }\n          }\n        }\n      },\n      "host_ip": {\n        "terms": {\n          "field": "host.ip",\n          "size": 10,\n          "order": {\n            "timestamp": "desc"\n          }\n        },\n        "aggs": {\n          "timestamp": {\n            "max": {\n              "field": "@timestamp"\n            }\n          }\n        }\n      },\n      "host_mac": {\n        "terms": {\n          "field": "host.mac",\n          "size": 10,\n          "order": {\n            "timestamp": "desc"\n          }\n        },\n        "aggs": {\n          "timestamp": {\n            "max": {\n              "field": "@timestamp"\n            }\n          }\n        }\n      },\n      "host_name": {\n        "terms": {\n          "field": "host.name",\n          "size": 10,\n          "order": {\n            "timestamp": "desc"\n          }\n        },\n        "aggs": {\n          "timestamp": {\n            "max": {\n              "field": "@timestamp"\n            }\n          }\n        }\n      },\n      "host_os_family": {\n        "terms": {\n          "field": "host.os.family",\n          "size": 10,\n          "order": {\n            "timestamp": "desc"\n          }\n        },\n        "aggs": {\n          "timestamp": {\n            "max": {\n              "field": "@timestamp"\n            }\n          }\n        }\n      },\n      "host_os_name": {\n        "terms": {\n          "field": "host.os.name",\n          "size": 10,\n          "order": {\n            "timestamp": "desc"\n          }\n        },\n        "aggs": {\n          "timestamp": {\n            "max": {\n              "field": "@timestamp"\n            }\n          }\n        }\n      },\n      "host_os_platform": {\n        "terms": {\n          "field": "host.os.platform",\n          "size": 10,\n          "order": {\n            "timestamp": "desc"\n          }\n        },\n        "aggs": {\n          "timestamp": {\n            "max": {\n              "field": "@timestamp"\n            }\n          }\n        }\n      },\n      "host_os_version": {\n        "terms": {\n          "field": "host.os.version",\n          "size": 10,\n          "order": {\n            "timestamp": "desc"\n          }\n        },\n        "aggs": {\n          "timestamp": {\n            "max": {\n              "field": "@timestamp"\n            }\n          }\n        }\n      },\n      "cloud_instance_id": {\n        "terms": {\n          "field": "cloud.instance.id",\n          "size": 10,\n          "order": {\n            "timestamp": "desc"\n          }\n        },\n        "aggs": {\n          "timestamp": {\n            "max": {\n              "field": "@timestamp"\n            }\n          }\n        }\n      },\n      "cloud_machine_type": {\n        "terms": {\n          "field": "cloud.machine.type",\n          "size": 10,\n          "order": {\n            "timestamp": "desc"\n          }\n        },\n        "aggs": {\n          "timestamp": {\n            "max": {\n              "field": "@timestamp"\n            }\n          }\n        }\n      },\n      "cloud_provider": {\n        "terms": {\n          "field": "cloud.provider",\n          "size": 10,\n          "order": {\n            "timestamp": "desc"\n          }\n        },\n        "aggs": {\n          "timestamp": {\n            "max": {\n              "field": "@timestamp"\n            }\n          }\n        }\n      },\n      "cloud_region": {\n        "terms": {\n          "field": "cloud.region",\n          "size": 10,\n          "order": {\n            "timestamp": "desc"\n          }\n        },\n        "aggs": {\n          "timestamp": {\n            "max": {\n              "field": "@timestamp"\n            }\n          }\n        }\n      }\n    },\n    "query": {\n      "bool": {\n        "filter": [\n          {\n            "term": {\n              "host.name": "raspberrypi"\n            }\n          },\n          {\n            "range": {\n              "@timestamp": {\n                "format": "strict_date_optional_time",\n                "gte": "2000-01-01T00:00:00.000Z",\n                "lte": "3000-01-01T00:00:00.000Z"\n              }\n            }\n          }\n        ]\n      }\n    },\n    "size": 0,\n    "track_total_hits": false\n  }\n}',
          ],
        },
        hostDetails: {
          _id: 'raspberrypi',
          host: {
            architecture: ['armv7l'],
            id: ['b19a781f683541a7a25ee345133aa399'],
            ip: ['151.205.0.17'],
            mac: [],
            name: ['raspberrypi'],
            os: {
              family: [''],
              name: ['Raspbian GNU/Linux'],
              platform: ['raspbian'],
              version: ['9 (stretch)'],
            },
          },
          cloud: {
            instance: {
              id: [],
            },
            machine: {
              type: [],
            },
            provider: [],
            region: [],
          },
        },
      };

      it('Make sure that we get HostDetails data', async () => {
        const { hostDetails } = await bsearch.send<HostDetailsStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: HostsQueries.details,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['filebeat-*'],
            docValueFields: [],
            hostName: 'raspberrypi',
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(hostDetails).to.eql(expectedResult.hostDetails);
      });
    });
  });
}
