/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Direction } from '../../../../../../common/search_strategy/common';
import type {
  AggregationRequest,
  HostAggEsItem,
} from '../../../../../../common/search_strategy/security_solution/hosts';
import { buildFieldsTermAggregation, formatHostItem } from './helpers';

describe('#Host details search strategy helpers', () => {
  describe('#buildFieldsTermAggregation', () => {
    test('it convert fields to aggregation terms', () => {
      const fields: readonly string[] = [
        'host.architecture',
        'host.id',
        'host.ip',
        'host.name',
        'host.os.family',
        'host.os.name',
      ];
      const expected: AggregationRequest = {
        host_architecture: {
          terms: {
            field: 'host.architecture',
            size: 10,
            order: {
              timestamp: Direction.desc,
            },
          },
          aggs: {
            timestamp: {
              max: {
                field: '@timestamp',
              },
            },
          },
        },
        host_id: {
          terms: {
            field: 'host.id',
            size: 10,
            order: {
              timestamp: Direction.desc,
            },
          },
          aggs: {
            timestamp: {
              max: {
                field: '@timestamp',
              },
            },
          },
        },
        host_ip: {
          terms: {
            field: 'host.ip',
            value_type: 'ip',
            size: 10,
            order: {
              timestamp: Direction.desc,
            },
          },
          aggs: {
            timestamp: {
              max: {
                field: '@timestamp',
              },
            },
          },
        },
        host_name: {
          terms: {
            field: 'host.name',
            size: 10,
            order: {
              timestamp: Direction.desc,
            },
          },
          aggs: {
            timestamp: {
              max: {
                field: '@timestamp',
              },
            },
          },
        },
        host_os_family: {
          terms: {
            field: 'host.os.family',
            size: 10,
            order: {
              timestamp: Direction.desc,
            },
          },
          aggs: {
            timestamp: {
              max: {
                field: '@timestamp',
              },
            },
          },
        },
        host_os_name: {
          terms: {
            field: 'host.os.name',
            size: 10,
            order: {
              timestamp: Direction.desc,
            },
          },
          aggs: {
            timestamp: {
              max: {
                field: '@timestamp',
              },
            },
          },
        },
      };
      expect(buildFieldsTermAggregation(fields)).toEqual(expected);
    });
  });

  const defaultTimestamp = { value: 1, value_as_string: 'timestamp' };
  describe('#getHostFieldValue', () => {
    test('it gets the host field value', () => {
      const bucket: HostAggEsItem = {
        host_name: {
          buckets: [{ key: 'host1', doc_count: 1, timestamp: defaultTimestamp }],
        },
        host_ip: {
          buckets: [{ key: 'ip1', doc_count: 1, timestamp: defaultTimestamp }],
        },
      };
      expect(formatHostItem(bucket)).toEqual({
        _id: 'host1',
        host: { name: ['host1'], ip: ['ip1'] },
      });
    });

    test('it returns multiple values when multiple buckets are present', () => {
      const bucket: HostAggEsItem = {
        host_name: {
          buckets: [{ key: 'host1', doc_count: 1, timestamp: defaultTimestamp }],
        },
        host_ip: {
          buckets: [
            { key: 'ip1', doc_count: 1, timestamp: defaultTimestamp },
            { key: 'ip2', doc_count: 1, timestamp: defaultTimestamp },
          ],
        },
      };
      expect(formatHostItem(bucket)).toEqual({
        _id: 'host1',
        host: { name: ['host1'], ip: ['ip1', 'ip2'] },
      });
    });
  });
});
