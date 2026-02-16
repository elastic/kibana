/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';
import { SLO_OVERVIEW_EMBEDDABLE_ID } from '../../../common/embeddables/overview/constants';
import { overviewEmbeddableSchema } from './schema';
import { getTransforms } from '../../../common/embeddables/overview/transforms/transforms';
import { registerOverviewEmbeddableTransforms } from './register_overview_embeddable_transforms';

describe('registerOverviewEmbeddableTransforms', () => {
  let embeddableSetupMock: ReturnType<typeof createEmbeddableSetupMock>;

  beforeEach(() => {
    embeddableSetupMock = createEmbeddableSetupMock();
  });

  it('should register transforms with correct embeddable type ID', () => {
    registerOverviewEmbeddableTransforms(embeddableSetupMock);

    expect(embeddableSetupMock.registerTransforms).toHaveBeenCalledTimes(1);
    expect(embeddableSetupMock.registerTransforms).toHaveBeenCalledWith(
      SLO_OVERVIEW_EMBEDDABLE_ID,
      expect.objectContaining({
        getSchema: expect.any(Function),
        getTransforms: expect.any(Function),
      })
    );
  });

  it('should register the correct schema', () => {
    registerOverviewEmbeddableTransforms(embeddableSetupMock);

    expect(embeddableSetupMock.registerTransforms).toHaveBeenCalledWith(
      SLO_OVERVIEW_EMBEDDABLE_ID,
      expect.objectContaining({
        getSchema: expect.any(Function),
        getTransforms: expect.any(Function),
      })
    );

    // Extract the registered configuration object
    const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
    const config = callArgs[1] as any;
    const schema = config.getSchema(['VALUE_CLICK_TRIGGER']);

    expect(schema).toBe(overviewEmbeddableSchema);
  });

  it('should register the correct transforms', () => {
    registerOverviewEmbeddableTransforms(embeddableSetupMock);

    const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
    const { getTransforms: getTransformsFromSetup } = callArgs[1];
    const transforms = getTransformsFromSetup!({} as any);

    // Check that transforms have the expected structure
    expect(transforms).toHaveProperty('transformOut');
    expect(typeof transforms.transformOut).toBe('function');

    // Verify it's the same function by checking behavior
    const expectedTransforms = getTransforms();
    const testState = { slo_id: 'test' };
    expect((transforms as any).transformOut(testState)).toEqual(
      (expectedTransforms as any).transformOut(testState)
    );
  });

  describe('schema validation', () => {
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
            filters: [{ term: { 'slo.id': 'test-slo' } }],
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

      expect(() =>
        overviewEmbeddableSchema.validate(stateWithOnlyRequiredGroupFields)
      ).not.toThrow();
    });
  });

  describe('transforms', () => {
    it('should register transforms that handle legacy state', () => {
      registerOverviewEmbeddableTransforms(embeddableSetupMock);

      const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
      const { getTransforms: getTransformsFromSetup } = callArgs[1];
      const transforms = getTransformsFromSetup!({} as any);

      expect(transforms).toHaveProperty('transformOut');
      expect(typeof transforms.transformOut).toBe('function');
    });

    it('should transform legacy state to new format', () => {
      registerOverviewEmbeddableTransforms(embeddableSetupMock);

      const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
      const { getTransforms: getTransformsFromSetup } = callArgs[1];
      const transforms = getTransformsFromSetup!({} as any);

      const legacyState = {
        sloId: 'legacy-slo-id',
        sloInstanceId: 'legacy-instance-id',
        remoteName: 'legacy-remote',
        overviewMode: 'single',
        showAllGroupByInstances: true,
        title: 'Test Title',
      };

      const transformed = (transforms as any).transformOut(legacyState as any);

      expect(transformed).toMatchObject({
        slo_id: 'legacy-slo-id',
        slo_instance_id: 'legacy-instance-id',
        remote_name: 'legacy-remote',
        overview_mode: 'single',
        show_all_group_by_instances: true,
        title: 'Test Title',
      });
    });

    it('should return state unchanged when no legacy fields are present', () => {
      registerOverviewEmbeddableTransforms(embeddableSetupMock);

      const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
      const { getTransforms: getTransformsFromSetup } = callArgs[1];
      const transforms = getTransformsFromSetup!({} as any);

      const newState = {
        slo_id: 'new-slo-id',
        slo_instance_id: 'new-instance-id',
        overview_mode: 'single',
        title: 'Test Title',
      };

      const transformed = (transforms as any).transformOut(newState as any);

      expect(transformed).toEqual(newState);
    });
  });
});
