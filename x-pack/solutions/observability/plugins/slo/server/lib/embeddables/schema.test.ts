/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockGetDrilldownsSchema } from '@kbn/embeddable-plugin/server/mocks';
import { getOverviewEmbeddableSchema } from './schema';

describe('schema validation', () => {
  const overviewEmbeddableSchema = getOverviewEmbeddableSchema(mockGetDrilldownsSchema);

  describe('SingleOverviewEmbeddableSchema', () => {
    it('should validate a valid single overview state', () => {
      const validState = {
        slo_id: 'test-slo-id',
        slo_instance_id: 'test-instance-id',
        remote_name: 'remote-1',
        overview_mode: 'single' as const,
        title: 'Test Title',
        hide_title: false,
      };

      expect(() => overviewEmbeddableSchema.validate(validState)).not.toThrow();
      const result = overviewEmbeddableSchema.validate(validState);
      expect(result).toMatchObject({
        slo_id: 'test-slo-id',
        slo_instance_id: 'test-instance-id',
        remote_name: 'remote-1',
        overview_mode: 'single',
      });
    });

    it('should validate single overview state with minimal required fields', () => {
      const minimalState = {
        slo_id: 'test-slo-id',
        overview_mode: 'single' as const,
      };

      expect(() => overviewEmbeddableSchema.validate(minimalState)).not.toThrow();
    });

    it('should reject invalid overview_mode value with targeted error', () => {
      const invalidState = {
        slo_id: 'test-slo-id',
        overview_mode: 'invalid-mode',
      };

      expect(() => overviewEmbeddableSchema.validate(invalidState)).toThrow(
        /expected "overview_mode" to be one of \["single", "groups"\]/
      );
    });

    it('should report missing overview_mode without cross-variant noise', () => {
      const missingMode = { slo_id: 'test-slo-id' };

      expect(() => overviewEmbeddableSchema.validate(missingMode)).toThrow(
        /"overview_mode" property is required/
      );
    });
  });

  describe('GroupOverviewEmbeddableSchema', () => {
    it('should validate a valid group overview state', () => {
      const validState = {
        group_filters: {
          group_by: 'status' as const,
          groups: ['healthy', 'degraded'],
          filters: [
            {
              type: 'condition' as const,
              condition: {
                field: 'slo.id',
                operator: 'is' as const,
                value: 'test-slo',
              },
            },
          ],
          kql_query: 'slo.name: "test"',
        },
        overview_mode: 'groups' as const,
        title: 'Test Title',
        hide_title: false,
      };

      expect(() => overviewEmbeddableSchema.validate(validState)).not.toThrow();
      const result = overviewEmbeddableSchema.validate(validState);
      expect(result).toMatchObject({
        group_filters: {
          group_by: 'status',
          groups: ['healthy', 'degraded'],
          kql_query: 'slo.name: "test"',
        },
        overview_mode: 'groups',
      });
      expect(result.overview_mode).toBe('groups');
      if (result.overview_mode === 'groups') {
        expect(result.group_filters.filters).toHaveLength(1);
        expect(result.group_filters.filters?.[0]).toMatchObject({
          type: 'condition',
          condition: {
            field: 'slo.id',
            operator: 'is',
            value: 'test-slo',
          },
        });
      }
    });

    it('should validate group overview state with all group_by options', () => {
      const groupByOptions = [
        'slo.tags',
        'status',
        'slo.indicator.type',
        '_index', // remote cluster
      ] as const;

      groupByOptions.forEach((groupBy) => {
        const state = {
          group_filters: {
            group_by: groupBy,
          },
          overview_mode: 'groups' as const,
        };

        expect(() => overviewEmbeddableSchema.validate(state)).not.toThrow();
      });
    });

    it('should validate group overview state with group_by _index (remote cluster)', () => {
      const state = {
        group_filters: {
          group_by: '_index' as const,
          groups: ['remote-cluster-1', 'remote-cluster-2'],
        },
        overview_mode: 'groups' as const,
      };

      expect(() => overviewEmbeddableSchema.validate(state)).not.toThrow();
      const result = overviewEmbeddableSchema.validate(state);
      expect(result).toMatchObject({
        group_filters: {
          group_by: '_index',
          groups: ['remote-cluster-1', 'remote-cluster-2'],
        },
        overview_mode: 'groups',
      });
    });

    it('should reject invalid group_by value without cross-variant slo_id error', () => {
      const invalidState = {
        group_filters: {
          group_by: 'invalid-group-by',
        },
        overview_mode: 'groups' as const,
      };

      expect(() => overviewEmbeddableSchema.validate(invalidState)).toThrow(
        /group_filters\.group_by/
      );
      expect(() => overviewEmbeddableSchema.validate(invalidState)).not.toThrow(/slo_id/);
    });

    it('should validate group overview state with minimal required fields', () => {
      const minimalState = {
        group_filters: {
          group_by: 'status' as const,
        },
        overview_mode: 'groups' as const,
      };

      expect(() => overviewEmbeddableSchema.validate(minimalState)).not.toThrow();
    });

    it('should default group_filters to { group_by: "status" } when group_filters is absent', () => {
      const result = overviewEmbeddableSchema.validate({
        overview_mode: 'groups' as const,
      });
      expect(result).toMatchObject({ group_filters: { group_by: 'status' } });
    });

    it('should default group_by to "status" when group_filters is empty', () => {
      const result = overviewEmbeddableSchema.validate({
        group_filters: {},
        overview_mode: 'groups' as const,
      });
      expect(result).toMatchObject({ group_filters: { group_by: 'status' } });
    });

    it('should default group_by to "status" when group_filters omits group_by', () => {
      const result = overviewEmbeddableSchema.validate({
        group_filters: { groups: ['healthy'] },
        overview_mode: 'groups' as const,
      });
      expect(result).toMatchObject({ group_filters: { group_by: 'status' } });
    });

    it('should reject groups array exceeding maxSize (100)', () => {
      const stateWithTooManyGroups = {
        group_filters: {
          group_by: 'status' as const,
          groups: Array.from({ length: 101 }, (_, i) => `group-${i}`),
        },
        overview_mode: 'groups' as const,
      };

      expect(() => overviewEmbeddableSchema.validate(stateWithTooManyGroups)).toThrow();
    });

    it('should accept groups array at maxSize (100)', () => {
      const stateWithMaxGroups = {
        group_filters: {
          group_by: 'status' as const,
          groups: Array.from({ length: 100 }, (_, i) => `group-${i}`),
        },
        overview_mode: 'groups' as const,
      };

      expect(() => overviewEmbeddableSchema.validate(stateWithMaxGroups)).not.toThrow();
    });

    it('should reject filters array exceeding maxSize (500)', () => {
      const stateWithTooManyFilters = {
        group_filters: {
          group_by: 'status' as const,
          filters: Array.from({ length: 501 }, () => ({
            type: 'condition' as const,
            condition: {
              field: 'slo.id',
              operator: 'is' as const,
              value: 'test',
            },
          })),
        },
        overview_mode: 'groups' as const,
      };

      expect(() => overviewEmbeddableSchema.validate(stateWithTooManyFilters)).toThrow();
    });

    it('should accept filters array at maxSize (500)', () => {
      const stateWithMaxFilters = {
        group_filters: {
          group_by: 'status' as const,
          filters: Array.from({ length: 500 }, () => ({
            type: 'condition' as const,
            condition: {
              field: 'slo.id',
              operator: 'is' as const,
              value: 'test',
            },
          })),
        },
        overview_mode: 'groups' as const,
      };

      expect(() => overviewEmbeddableSchema.validate(stateWithMaxFilters)).not.toThrow();
    });
  });

  it('should validate single overview state with optional fields omitted', () => {
    // Test that optional fields can be omitted when required fields are present
    const stateWithOnlyRequiredFields = {
      slo_id: 'test-slo-id',
      overview_mode: 'single' as const,
      // slo_instance_id, remote_name are all optional
    };

    expect(() => overviewEmbeddableSchema.validate(stateWithOnlyRequiredFields)).not.toThrow();
  });

  it('should validate group overview state when groups, filters and kql_query are omitted', () => {
    const stateWithoutOptionalGroupFields = {
      group_filters: {
        group_by: 'status' as const,
      },
      overview_mode: 'groups' as const,
    };

    expect(() => overviewEmbeddableSchema.validate(stateWithoutOptionalGroupFields)).not.toThrow();
  });
});
