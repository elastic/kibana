/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHostDetailsPageFilters, getIdentityFieldsPageFilters } from './helpers';
import type { Filter } from '@kbn/es-query';

describe('hosts page helpers', () => {
  describe('getHostDetailsPageFilters', () => {
    it('correctly constructs pageFilters for the given hostName', () => {
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
      expect(getHostDetailsPageFilters('host-1')).toEqual(expected);
    });
  });

  describe('getIdentityFieldsPageFilters', () => {
    it('builds one phrase filter per non-empty identity field', () => {
      const expected: Filter[] = [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'host.id',
            value: 'hid-1',
            params: { query: 'hid-1' },
          },
          query: {
            match: {
              'host.id': { query: 'hid-1', type: 'phrase' },
            },
          },
        },
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'host.name',
            value: 'host-1',
            params: { query: 'host-1' },
          },
          query: {
            match: {
              'host.name': { query: 'host-1', type: 'phrase' },
            },
          },
        },
      ];
      expect(getIdentityFieldsPageFilters({ 'host.id': 'hid-1', 'host.name': 'host-1' })).toEqual(
        expected
      );
    });

    it('omits empty or whitespace-only values', () => {
      expect(
        getIdentityFieldsPageFilters({ 'host.name': 'ok', 'host.id': '  ', 'entity.id': '' })
      ).toEqual(getHostDetailsPageFilters('ok'));
    });
  });
});
