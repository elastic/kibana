/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHostDetailsPageFilters } from './helpers';
import type { Filter } from '@kbn/es-query';

describe('hosts page helpers', () => {
  describe('getHostDetailsPageFilters', () => {
    it('correctly constructs pageFilters for entityIdentifiers with host.name', () => {
      const expected: Filter[] = [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'host.name',
            value: 'host-1',
            params: {
              query: 'host-1',
            },
          },
          query: {
            match: {
              'host.name': {
                query: 'host-1',
                type: 'phrase',
              },
            },
          },
        },
      ];
      expect(getHostDetailsPageFilters({ 'host.name': 'host-1' })).toEqual(expected);
    });

    it('correctly constructs pageFilters for entityIdentifiers with host.id (EUID priority)', () => {
      const expected: Filter[] = [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'host.id',
            value: 'host-id-123',
            params: {
              query: 'host-id-123',
            },
          },
          query: {
            match: {
              'host.id': {
                query: 'host-id-123',
                type: 'phrase',
              },
            },
          },
        },
      ];
      expect(getHostDetailsPageFilters({ 'host.id': 'host-id-123' })).toEqual(expected);
    });

    it('correctly constructs pageFilters for composite entityIdentifiers (host.name + host.domain)', () => {
      const result = getHostDetailsPageFilters({
        'host.name': 'server1',
        'host.domain': 'example.com',
      });
      expect(result).toHaveLength(2);
      expect(result[0].meta?.key).toBe('host.name');
      expect(result[0].meta?.value).toBe('server1');
      expect(result[1].meta?.key).toBe('host.domain');
      expect(result[1].meta?.value).toBe('example.com');
    });
  });
});
