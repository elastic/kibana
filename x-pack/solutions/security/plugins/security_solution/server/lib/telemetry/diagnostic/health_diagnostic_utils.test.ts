/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intervalFromDate } from '@kbn/task-manager-plugin/server/lib/intervals';
import { shouldExecute, applyFilterlist, fieldNames } from './health_diagnostic_utils';
import { Action } from './health_diagnostic_service.types';

describe('Security Solution - Health Diagnostic Queries - utils', () => {
  describe('applyFilterlist', () => {
    const mockSalt = 'test-salt';

    beforeEach(() => {
      // Mock crypto.subtle for consistent testing
      Object.defineProperty(global, 'crypto', {
        value: {
          subtle: {
            digest: jest.fn().mockResolvedValue(
              new ArrayBuffer(32) // Mock SHA-256 output
            ),
          },
        },
        writable: true,
      });
    });

    test('should keep fields marked with KEEP action', async () => {
      const data = [{ user: { name: 'john', email: 'john@example.com' } }];
      const rules = {
        'user.name': Action.KEEP,
        'user.email': Action.KEEP,
      };

      const result = await applyFilterlist(data, rules, mockSalt);

      expect(result).toEqual([
        {
          user: {
            name: 'john',
            email: 'john@example.com',
          },
        },
      ]);
    });

    test('should mask fields marked with MASK action', async () => {
      const data = [{ user: { name: 'john', password: 'secret123' } }];
      const rules = {
        'user.name': Action.KEEP,
        'user.password': Action.MASK,
      };

      const result = await applyFilterlist(data, rules, mockSalt);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        user: {
          name: 'john',
          password: expect.any(String),
        },
      });
      // Password should be masked (different from original)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result[0] as any).user.password).not.toBe('secret123');
    });

    test('should handle nested object structures', async () => {
      const data = [
        {
          meta: {
            host: {
              name: 'server1',
              ip: '192.168.1.1',
            },
          },
        },
      ];
      const rules = {
        'meta.host.name': Action.KEEP,
        'meta.host.ip': Action.MASK,
      };

      const result = await applyFilterlist(data, rules, mockSalt);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        meta: {
          host: {
            name: 'server1',
            ip: expect.any(String),
          },
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result[0] as any).meta.host.ip).not.toBe('192.168.1.1');
    });

    test('should handle arrays of documents', async () => {
      const data = [
        [
          { user: 'alice', token: 'abc123' },
          { user: 'bob', token: 'xyz789' },
        ],
      ];
      const rules = {
        user: Action.KEEP,
        token: Action.MASK,
      };

      const result = await applyFilterlist(data, rules, mockSalt);

      expect(result).toHaveLength(1);
      expect(Array.isArray(result[0])).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docs = result[0] as any[];
      expect(docs).toHaveLength(2);
      expect(docs[0].user).toBe('alice');
      expect(docs[1].user).toBe('bob');
      expect(docs[0].token).not.toBe('abc123');
      expect(docs[1].token).not.toBe('xyz789');
    });

    test('should handle arrays of complex documents', async () => {
      const data = [
        {
          per_minute: {
            buckets: [
              {
                key_as_string: '2025-08-13T13:56:00.000Z',
                key: 1755093360000,
                doc_count: 2,
                per_node: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'RfUrmQqJSL67wlQKvO95gg',
                      doc_count: 1,
                      avg_cpu: {
                        value: 0.830078125,
                      },
                      avg_jvm_heap: {
                        value: 51,
                      },
                    },
                    {
                      key: '_ypuq9evRyqjr5aBJmsPrA',
                      doc_count: 1,
                      avg_cpu: {
                        value: 0.58984375,
                      },
                      avg_jvm_heap: {
                        value: 6,
                      },
                    },
                  ],
                },
              },
              {
                key_as_string: '2025-08-13T13:57:00.000Z',
                key: 1755093420000,
                doc_count: 18,
                per_node: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'RfUrmQqJSL67wlQKvO95gg',
                      doc_count: 6,
                      avg_cpu: {
                        value: 0.6482747395833334,
                      },
                      avg_jvm_heap: {
                        value: 42.833333333333336,
                      },
                    },
                    {
                      key: 'UHo_pnFMQFqkbewG85AYoA',
                      doc_count: 6,
                      avg_cpu: {
                        value: 0.5349527994791666,
                      },
                      avg_jvm_heap: {
                        value: 57,
                      },
                    },
                    {
                      key: '_ypuq9evRyqjr5aBJmsPrA',
                      doc_count: 6,
                      avg_cpu: {
                        value: 0.506591796875,
                      },
                      avg_jvm_heap: {
                        value: 12,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ];

      const rules = {
        'per_minute.buckets.key_as_string': Action.KEEP,
        'per_minute.buckets.key': Action.KEEP,
        'per_minute.buckets.doc_count': Action.KEEP,
        'per_minute.buckets.per_node.doc_count_error_upper_bound': Action.KEEP,
        'per_minute.buckets.per_node.sum_other_doc_count': Action.KEEP,
        'per_minute.buckets.per_node.buckets.key': Action.KEEP,
        'per_minute.buckets.per_node.buckets.doc_count': Action.KEEP,
        'per_minute.buckets.per_node.buckets.avg_cpu.value': Action.KEEP,
        'per_minute.buckets.per_node.buckets.avg_jvm_heap.value': Action.KEEP,
      };

      const result = await applyFilterlist(data, rules, mockSalt);

      expect(result).toHaveLength(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aggrs = result[0] as any;

      expect(aggrs.per_minute).toBeDefined();
      expect(typeof aggrs.per_minute).toBe('object');
      expect(Array.isArray(aggrs.per_minute.buckets)).toBe(true);
      expect(aggrs.per_minute.buckets).toHaveLength(2);

      const firstBucket = aggrs.per_minute.buckets[0];
      expect(firstBucket.key_as_string).toBe('2025-08-13T13:56:00.000Z');
      expect(firstBucket.key).toBe(1755093360000);
      expect(firstBucket.doc_count).toBe(2);
      expect(firstBucket.per_node.doc_count_error_upper_bound).toBe(0);
      expect(firstBucket.per_node.sum_other_doc_count).toBe(0);
      expect(Array.isArray(firstBucket.per_node.buckets)).toBe(true);
      expect(firstBucket.per_node.buckets).toHaveLength(2);

      const firstNodeBucket = firstBucket.per_node.buckets[0];
      expect(firstNodeBucket.key).toBe('RfUrmQqJSL67wlQKvO95gg');
      expect(firstNodeBucket.doc_count).toBe(1);
      expect(firstNodeBucket.avg_cpu.value).toBe(0.830078125);
      expect(firstNodeBucket.avg_jvm_heap.value).toBe(51);

      const secondBucket = aggrs.per_minute.buckets[1];
      expect(secondBucket.key_as_string).toBe('2025-08-13T13:57:00.000Z');
      expect(secondBucket.key).toBe(1755093420000);
      expect(secondBucket.doc_count).toBe(18);
      expect(Array.isArray(secondBucket.per_node.buckets)).toBe(true);
      expect(secondBucket.per_node.buckets).toHaveLength(3);
    });

    test('should skip non-existent fields', async () => {
      const data = [{ user: 'john', email: 'john@example.com' }];
      const rules = {
        user: Action.KEEP,
        password: Action.MASK, // This field doesn't exist
        'profile.age': Action.KEEP, // This nested field doesn't exist
      };

      const result = await applyFilterlist(data, rules, mockSalt);

      expect(result).toEqual([{ user: 'john' }]);
    });

    test('should handle empty data array', async () => {
      const data: unknown[] = [];
      const rules = { user: Action.KEEP };

      const result = await applyFilterlist(data, rules, mockSalt);

      expect(result).toEqual([]);
    });

    test('should handle empty rules', async () => {
      const data = [{ user: 'john', email: 'john@example.com' }];
      const rules = {};

      const result = await applyFilterlist(data, rules, mockSalt);

      expect(result).toEqual([{}]);
    });

    test('should create nested structure when intermediate objects do not exist', async () => {
      const data = [{ user: { profile: { name: 'john' } } }];
      const rules = {
        'user.profile.name': Action.KEEP,
      };

      const result = await applyFilterlist(data, rules, mockSalt);

      expect(result).toEqual([
        {
          user: {
            profile: {
              name: 'john',
            },
          },
        },
      ]);
    });

    test('should handle mixed document types', async () => {
      const data = [
        { type: 'user', name: 'john', password: 'secret' },
        [{ type: 'admin', name: 'admin', token: 'admin123' }],
      ];
      const rules = {
        name: Action.KEEP,
        password: Action.MASK,
        token: Action.MASK,
      };

      const result = await applyFilterlist(data, rules, mockSalt);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ name: 'john' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result[0] as any).password).not.toBe('secret');
      expect(Array.isArray(result[1])).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adminDocs = result[1] as any[];
      expect(adminDocs[0].name).toBe('admin');
      expect(adminDocs[0].token).not.toBe('admin123');
    });

    test('should handle numeric and boolean values', async () => {
      const data = [
        {
          count: 42,
          active: true,
          score: 98.5,
          sensitiveId: 12345,
        },
      ];
      const rules = {
        count: Action.KEEP,
        active: Action.KEEP,
        score: Action.KEEP,
        sensitiveId: Action.MASK,
      };

      const result = await applyFilterlist(data, rules, mockSalt);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        count: 42,
        active: true,
        score: 98.5,
        sensitiveId: expect.any(String),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result[0] as any).sensitiveId).not.toBe('12345');
    });
  });

  describe('fieldNames', () => {
    test('should extract field names from simple object', () => {
      const input = { name: 'john', age: 30, active: true };
      const result = fieldNames(input);
      expect(result.sort()).toEqual(['active', 'age', 'name']);
    });

    test('should extract nested field names', () => {
      const input = {
        user: {
          profile: {
            name: 'john',
            email: 'john@example.com',
          },
          settings: {
            theme: 'dark',
          },
        },
      };
      const result = fieldNames(input);
      expect(result.sort()).toEqual([
        'user.profile.email',
        'user.profile.name',
        'user.settings.theme',
      ]);
    });

    test('should handle arrays with elements', () => {
      const input = {
        users: [{ name: 'john', age: 30 }],
        tags: ['security', 'admin'],
      };
      const result = fieldNames(input);
      expect(result.sort()).toEqual(['tags[]', 'users[].age', 'users[].name']);
    });

    test('should handle empty arrays', () => {
      const input = {
        users: [],
        tags: [],
        data: 'test',
      };
      const result = fieldNames(input);
      expect(result.sort()).toEqual(['data', 'tags[]', 'users[]']);
    });

    test('should handle mixed data types', () => {
      const input = {
        string: 'text',
        number: 42,
        boolean: true,
        nullValue: null,
        undefinedValue: undefined,
        object: {
          nested: 'value',
        },
      };
      const result = fieldNames(input);
      expect(result.sort()).toEqual([
        'boolean',
        'nullValue',
        'number',
        'object.nested',
        'string',
        'undefinedValue',
      ]);
    });

    test('should handle deeply nested structures', () => {
      const input = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      };
      const result = fieldNames(input);
      expect(result).toEqual(['level1.level2.level3.level4.value']);
    });

    test('should handle arrays of objects with different structures', () => {
      const input = {
        items: [
          { name: 'item1', type: 'A' },
          { name: 'item2', category: 'B' },
        ],
      };
      const result = fieldNames(input);
      expect(result.sort()).toEqual(['items[].name', 'items[].type']);
    });

    test('should handle nested arrays', () => {
      const input = {
        matrix: [[{ x: 1, y: 2 }]],
      };
      const result = fieldNames(input);
      expect(result.sort()).toEqual(['matrix[][].x', 'matrix[][].y']);
    });

    test('should handle empty object', () => {
      const input = {};
      const result = fieldNames(input);
      expect(result).toEqual([]);
    });

    test('should handle primitive values', () => {
      expect(fieldNames('string')).toEqual(['']);
      expect(fieldNames(42)).toEqual(['']);
      expect(fieldNames(true)).toEqual(['']);
      expect(fieldNames(null)).toEqual(['']);
      expect(fieldNames(undefined)).toEqual(['']);
    });

    test('should handle complex real-world structure', () => {
      const input = {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        event: {
          action: 'login',
          outcome: 'success',
        },
        user: {
          id: '123',
          name: 'john.doe',
          roles: ['admin', 'user'],
        },
        host: {
          name: 'server01',
          ip: ['192.168.1.1', '10.0.0.1'],
        },
        process: {
          pid: 1234,
          args: ['-f', '/etc/config'],
        },
        tags: [],
      };
      const result = fieldNames(input);
      expect(result.sort()).toEqual([
        '@timestamp',
        'event.action',
        'event.outcome',
        'host.ip[]',
        'host.name',
        'process.args[]',
        'process.pid',
        'tags[]',
        'user.id',
        'user.name',
        'user.roles[]',
      ]);
    });
  });

  describe('nextExecution', () => {
    test.each([
      ['5m', '2025-05-14T17:00:00.000Z', '2025-05-14T17:03:00.000Z', false],
      ['5m', '2025-05-14T17:00:00.000Z', '2025-05-14T17:06:00.000Z', true],
      ['5m', '2025-05-14T17:00:00.000Z', '2025-05-14T18:03:00.000Z', true],
      ['1h', '2025-05-14T17:00:00.000Z', '2025-05-14T18:00:00.000Z', false],
      ['1h', '2025-05-14T17:00:00.000Z', '2025-05-14T18:01:00.000Z', true],
      ['1h', '2025-05-14T17:00:00.000Z', '2025-05-15T01:00:00.000Z', true],
      ['1h', '2025-05-14T17:00:00.000Z', '2025-05-12T01:00:00.000Z', false],
      ['1s', '2025-05-02T17:00:00.000Z', '2025-06-30T17:00:00.000Z', true],
      ['30d', '2025-05-31T17:00:00.000Z', '2025-06-29T17:00:00.000Z', false],
      ['365d', '2025-01-31T17:00:00.000Z', '2025-12-31T17:00:00.000Z', false],
    ])(
      'should add %s to %s when endDate is %s and return %s',
      (interval, startDate, endDate, expected) => {
        expect(shouldExecute(new Date(startDate), new Date(endDate), interval)).toBe(expected);
      }
    );

    test.each([
      ['5m', '2025-05-14T17:00:00.000Z', '2025-05-14T17:05:00.000Z'],
      ['1h', '2025-05-14T17:00:00.000Z', '2025-05-14T18:00:00.000Z'],
      ['24h', '2025-05-14T17:00:00.000Z', '2025-05-15T17:00:00.000Z'],
      ['30d', '2025-05-31T17:00:00.000Z', '2025-06-30T17:00:00.000Z'],
      ['365d', '2025-05-31T17:00:00.000Z', '2026-05-31T17:00:00.000Z'],
    ])('adding %s to %s should be equal to %s', (interval, dateFrom, expected) => {
      const next = intervalFromDate(new Date(dateFrom), interval);
      expect(next).toEqual(new Date(expected));
    });
  });
});
