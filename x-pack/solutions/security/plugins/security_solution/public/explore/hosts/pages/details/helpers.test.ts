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

    it('uses host.entity.id when present (EUID priority)', () => {
      const result = getHostDetailsPageFilters({
        'host.entity.id': 'euid-123',
        'host.name': 'host-1',
      });
      expect(result).toHaveLength(1);
      expect(result[0].meta?.key).toBe('host.entity.id');
      expect(result[0].meta?.value).toBe('euid-123');
    });
  });
});
