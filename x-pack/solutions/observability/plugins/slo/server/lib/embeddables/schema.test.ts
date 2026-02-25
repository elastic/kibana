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
        show_all_group_by_instances: true,
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
        show_all_group_by_instances: true,
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

    it('should reject invalid overview_mode value', () => {
      const invalidState = {
        slo_id: 'test-slo-id',
        overview_mode: 'invalid-mode',
      };

      expect(() => overviewEmbeddableSchema.validate(invalidState)).toThrow();
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
      if ('group_filters' in result && result.group_filters) {
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
      const groupByOptions = ['slo.tags', 'status', 'slo.indicator.type'] as const;

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

    it('should reject invalid group_by value', () => {
      const invalidState = {
        group_filters: {
          group_by: 'invalid-group-by',
        },
        overview_mode: 'groups' as const,
      };

      expect(() => overviewEmbeddableSchema.validate(invalidState)).toThrow();
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

    it('should validate group overview state with empty group_filters or missing group_by', () => {
      const stateWithEmptyGroupFilters = {
        group_filters: {},
        overview_mode: 'groups' as const,
      };
      expect(() => overviewEmbeddableSchema.validate(stateWithEmptyGroupFilters)).not.toThrow();

      const stateWithGroupFiltersWithoutGroupBy = {
        group_filters: { groups: ['healthy'] },
        overview_mode: 'groups' as const,
      };
      expect(() =>
        overviewEmbeddableSchema.validate(stateWithGroupFiltersWithoutGroupBy)
      ).not.toThrow();
    });
  });

  it('should validate single overview state with optional fields omitted', () => {
    // Test that optional fields can be omitted when required fields are present
    const stateWithOnlyRequiredFields = {
      slo_id: 'test-slo-id',
      overview_mode: 'single' as const,
      // slo_instance_id, remote_name, show_all_group_by_instances are all optional
    };

    expect(() => overviewEmbeddableSchema.validate(stateWithOnlyRequiredFields)).not.toThrow();
  });

  it('should validate group overview state with optional fields omitted', () => {
    // Test that optional fields within group_filters can be omitted
    const stateWithOnlyRequiredGroupFields = {
      group_filters: {
        group_by: 'status' as const,
        // groups, filters, kql_query are all optional
      },
      overview_mode: 'groups' as const,
    };

    expect(() => overviewEmbeddableSchema.validate(stateWithOnlyRequiredGroupFields)).not.toThrow();
  });
});
