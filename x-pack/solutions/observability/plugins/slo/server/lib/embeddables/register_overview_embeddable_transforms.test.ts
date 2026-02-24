/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';
import { SLO_OVERVIEW_EMBEDDABLE_ID } from '../../../common/embeddables/overview/constants';
import { registerOverviewEmbeddableTransforms } from './register_overview_embeddable_transforms';

const createMockDrilldownTransforms = (): DrilldownTransforms => ({
  transformIn: (state) => ({ state, references: [] }),
  transformOut: (state) => state,
});

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

  it('should register the correct schema including drilldowns', () => {
    registerOverviewEmbeddableTransforms(embeddableSetupMock);

    expect(embeddableSetupMock.registerTransforms).toHaveBeenCalledWith(
      SLO_OVERVIEW_EMBEDDABLE_ID,
      expect.objectContaining({
        getSchema: expect.any(Function),
        getTransforms: expect.any(Function),
      })
    );

    // getSchema receives getDrilldownsSchema and returns schema that includes drilldowns
    const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
    const config = callArgs[1] as any;
    const mockGetDrilldownsSchema = (triggers: string[]) =>
      schema.object({ drilldowns: schema.maybe(schema.arrayOf(schema.any())) });
    const schemaWithDrilldowns = config.getSchema(mockGetDrilldownsSchema);

    expect(schemaWithDrilldowns).toBeDefined();
    // Schema should validate overview state
    const validState = {
      slo_id: 'test-slo-id',
      overview_mode: 'single' as const,
    };
    expect(() => schemaWithDrilldowns.validate(validState)).not.toThrow();
    // Schema should allow drilldowns key (fixes "definition for this key is missing" when saving)
    expect(() => schemaWithDrilldowns.validate({ ...validState, drilldowns: [] })).not.toThrow();
  });

  it('should register transforms that return transformOut', () => {
    registerOverviewEmbeddableTransforms(embeddableSetupMock);

    const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
    const { getTransforms: getTransformsFromSetup } = callArgs[1];
    const transforms = getTransformsFromSetup!(createMockDrilldownTransforms());

    expect(transforms).toHaveProperty('transformOut');
    const transformOut = transforms.transformOut;
    expect(typeof transformOut).toBe('function');
    if (!transformOut) throw new Error('transformOut is required');

    const testState = { slo_id: 'test', overview_mode: 'single' as const };
    expect(transformOut(testState)).toMatchObject({
      slo_id: 'test',
      overview_mode: 'single',
    });
  });

  describe('transforms', () => {
    it('should register transforms that handle legacy state', () => {
      registerOverviewEmbeddableTransforms(embeddableSetupMock);

      const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
      const { getTransforms: getTransformsFromSetup } = callArgs[1];
      const transforms = getTransformsFromSetup!(createMockDrilldownTransforms());

      expect(transforms).toHaveProperty('transformOut');
      expect(typeof transforms.transformOut).toBe('function');
    });

    it('should transform legacy state to new format', () => {
      registerOverviewEmbeddableTransforms(embeddableSetupMock);

      const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
      const { getTransforms: getTransformsFromSetup } = callArgs[1];
      const transforms = getTransformsFromSetup!(createMockDrilldownTransforms());

      const legacyState = {
        sloId: 'legacy-slo-id',
        sloInstanceId: 'legacy-instance-id',
        remoteName: 'legacy-remote',
        overviewMode: 'single',
        showAllGroupByInstances: true,
        title: 'Test Title',
      };

      const transformOut = transforms.transformOut!;
      const transformed = transformOut(legacyState);

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
      const transforms = getTransformsFromSetup!(createMockDrilldownTransforms());

      const newState = {
        slo_id: 'new-slo-id',
        slo_instance_id: 'new-instance-id',
        overview_mode: 'single',
        title: 'Test Title',
      };

      const transformOut = transforms.transformOut!;
      const transformed = transformOut(newState);

      expect(transformed).toMatchObject({
        slo_id: 'new-slo-id',
        slo_instance_id: 'new-instance-id',
        overview_mode: 'single',
        title: 'Test Title',
      });
    });
  });
});
