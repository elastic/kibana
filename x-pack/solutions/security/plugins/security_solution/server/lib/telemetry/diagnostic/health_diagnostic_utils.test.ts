/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyFilterlist } from './health_diagnostic_utils';
import { Action } from './health_diagnostic_service.types';

describe('health_diagnostic_utils', () => {
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
});
