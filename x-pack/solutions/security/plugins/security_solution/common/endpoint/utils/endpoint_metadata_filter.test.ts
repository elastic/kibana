/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildBaseEndpointMetadataFilter } from './endpoint_metadata_filter';

describe('buildBaseEndpointMetadataFilter', () => {
  describe('when no policy IDs are provided', () => {
    it('should return base filters without policy filter when policyIds is undefined', () => {
      const result = buildBaseEndpointMetadataFilter();

      expect(result).toEqual({
        bool: {
          must_not: {
            terms: {
              'agent.id': [
                '00000000-0000-0000-0000-000000000000',
                '11111111-1111-1111-1111-111111111111',
              ],
            },
          },
          filter: [
            { exists: { field: 'united.endpoint.agent.id' } },
            { exists: { field: 'united.agent.agent.id' } },
            {
              term: {
                'united.agent.active': {
                  value: true,
                },
              },
            },
          ],
        },
      });
    });

    it('should return base filters without policy filter when policyIds is null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = buildBaseEndpointMetadataFilter(null as any);

      expect(result).toEqual({
        bool: {
          must_not: {
            terms: {
              'agent.id': [
                '00000000-0000-0000-0000-000000000000',
                '11111111-1111-1111-1111-111111111111',
              ],
            },
          },
          filter: [
            { exists: { field: 'united.endpoint.agent.id' } },
            { exists: { field: 'united.agent.agent.id' } },
            {
              term: {
                'united.agent.active': {
                  value: true,
                },
              },
            },
          ],
        },
      });
    });
  });

  describe('when policy IDs are provided', () => {
    it('should include policy filter when policyIds is an empty array', () => {
      const result = buildBaseEndpointMetadataFilter([]);

      expect(result).toEqual({
        bool: {
          must_not: {
            terms: {
              'agent.id': [
                '00000000-0000-0000-0000-000000000000',
                '11111111-1111-1111-1111-111111111111',
              ],
            },
          },
          filter: [
            { exists: { field: 'united.endpoint.agent.id' } },
            { exists: { field: 'united.agent.agent.id' } },
            {
              term: {
                'united.agent.active': {
                  value: true,
                },
              },
            },
            {
              terms: {
                'united.agent.policy_id': [],
              },
            },
          ],
        },
      });
    });

    it('should include policy filter with single policy ID', () => {
      const policyIds = ['policy-1'];
      const result = buildBaseEndpointMetadataFilter(policyIds);

      expect(result).toEqual({
        bool: {
          must_not: {
            terms: {
              'agent.id': [
                '00000000-0000-0000-0000-000000000000',
                '11111111-1111-1111-1111-111111111111',
              ],
            },
          },
          filter: [
            { exists: { field: 'united.endpoint.agent.id' } },
            { exists: { field: 'united.agent.agent.id' } },
            {
              term: {
                'united.agent.active': {
                  value: true,
                },
              },
            },
            {
              terms: {
                'united.agent.policy_id': ['policy-1'],
              },
            },
          ],
        },
      });
    });

    it('should include policy filter with multiple policy IDs', () => {
      const policyIds = ['policy-1', 'policy-2', 'policy-3'];
      const result = buildBaseEndpointMetadataFilter(policyIds);

      expect(result).toEqual({
        bool: {
          must_not: {
            terms: {
              'agent.id': [
                '00000000-0000-0000-0000-000000000000',
                '11111111-1111-1111-1111-111111111111',
              ],
            },
          },
          filter: [
            { exists: { field: 'united.endpoint.agent.id' } },
            { exists: { field: 'united.agent.agent.id' } },
            {
              term: {
                'united.agent.active': {
                  value: true,
                },
              },
            },
            {
              terms: {
                'united.agent.policy_id': ['policy-1', 'policy-2', 'policy-3'],
              },
            },
          ],
        },
      });
    });

    it('should deduplicate policy IDs using uniq', () => {
      const policyIds = ['policy-1', 'policy-2', 'policy-1', 'policy-3', 'policy-2'];
      const result = buildBaseEndpointMetadataFilter(policyIds);

      expect(result).toEqual({
        bool: {
          must_not: {
            terms: {
              'agent.id': [
                '00000000-0000-0000-0000-000000000000',
                '11111111-1111-1111-1111-111111111111',
              ],
            },
          },
          filter: [
            { exists: { field: 'united.endpoint.agent.id' } },
            { exists: { field: 'united.agent.agent.id' } },
            {
              term: {
                'united.agent.active': {
                  value: true,
                },
              },
            },
            {
              terms: {
                'united.agent.policy_id': ['policy-1', 'policy-2', 'policy-3'],
              },
            },
          ],
        },
      });
    });
  });

  describe('filter structure', () => {
    it('should always include ignored agent IDs filter', () => {
      const result = buildBaseEndpointMetadataFilter(['policy-1']);

      expect(result.bool).toBeDefined();
      expect(result.bool!.must_not).toEqual({
        terms: {
          'agent.id': [
            '00000000-0000-0000-0000-000000000000',
            '11111111-1111-1111-1111-111111111111',
          ],
        },
      });
    });

    it('should always include base existence and active filters', () => {
      const result = buildBaseEndpointMetadataFilter();

      expect(result.bool).toBeDefined();
      const baseFilters = result.bool!.filter;
      expect(baseFilters).toContainEqual({ exists: { field: 'united.endpoint.agent.id' } });
      expect(baseFilters).toContainEqual({ exists: { field: 'united.agent.agent.id' } });
      expect(baseFilters).toContainEqual({
        term: {
          'united.agent.active': {
            value: true,
          },
        },
      });
    });
  });
});
