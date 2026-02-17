/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';
import { SLO_BURN_RATE_EMBEDDABLE_ID } from '../../../common/embeddables/burn_rate/constants';
import { burnRateEmbeddableSchema } from './schema';
import { getTransforms } from '../../../common/embeddables/burn_rate/transforms/transforms';
import { registerBurnRateEmbeddableTransforms } from './register_burn_rate_embeddable_transforms';

describe('registerBurnRateEmbeddableTransforms', () => {
  let embeddableSetupMock: ReturnType<typeof createEmbeddableSetupMock>;

  beforeEach(() => {
    embeddableSetupMock = createEmbeddableSetupMock();
  });

  it('should register transforms with correct embeddable type ID', () => {
    registerBurnRateEmbeddableTransforms(embeddableSetupMock);

    expect(embeddableSetupMock.registerTransforms).toHaveBeenCalledTimes(1);
    expect(embeddableSetupMock.registerTransforms).toHaveBeenCalledWith(
      SLO_BURN_RATE_EMBEDDABLE_ID,
      expect.objectContaining({
        getSchema: expect.any(Function),
        getTransforms: expect.any(Function),
      })
    );
  });

  it('should register the correct schema', () => {
    registerBurnRateEmbeddableTransforms(embeddableSetupMock);

    expect(embeddableSetupMock.registerTransforms).toHaveBeenCalledWith(
      SLO_BURN_RATE_EMBEDDABLE_ID,
      expect.objectContaining({
        getSchema: expect.any(Function),
        getTransforms: expect.any(Function),
      })
    );

    // Extract the registered configuration object
    const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
    const config = callArgs[1] as any;
    const schema = config.getSchema(['VALUE_CLICK_TRIGGER']);

    expect(schema).toBe(burnRateEmbeddableSchema);
  });

  it('should register the correct transforms', () => {
    registerBurnRateEmbeddableTransforms(embeddableSetupMock);

    const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
    const { getTransforms: getTransformsFromSetup } = callArgs[1];
    const transforms = getTransformsFromSetup!({} as any);

    // Check that transforms have the expected structure
    expect(transforms).toHaveProperty('transformOut');
    expect(typeof transforms.transformOut).toBe('function');

    // Verify it's the same function by checking behavior
    const expectedTransforms = getTransforms();
    const testState = { slo_id: 'test', duration: '1h' };
    expect((transforms as any).transformOut(testState)).toEqual(
      (expectedTransforms as any).transformOut(testState)
    );
  });

  describe('schema validation', () => {
    it('should validate a valid burn rate state', () => {
      const validState = {
        slo_id: 'test-slo-id',
        slo_instance_id: 'test-instance-id',
        duration: '1h',
        title: 'Test Title',
        hide_title: false,
      };

      expect(() => burnRateEmbeddableSchema.validate(validState)).not.toThrow();
      const result = burnRateEmbeddableSchema.validate(validState);
      expect(result).toMatchObject({
        slo_id: 'test-slo-id',
        slo_instance_id: 'test-instance-id',
        duration: '1h',
      });
    });

    it('should validate burn rate state with minimal required fields', () => {
      const minimalState = {
        slo_id: 'test-slo-id',
        duration: '1h',
      };

      expect(() => burnRateEmbeddableSchema.validate(minimalState)).not.toThrow();
    });

    it('should reject state without required slo_id', () => {
      const invalidState = {
        duration: '1h',
      };

      expect(() => burnRateEmbeddableSchema.validate(invalidState)).toThrow();
    });

    it('should reject state without required duration', () => {
      const invalidState = {
        slo_id: 'test-slo-id',
      };

      expect(() => burnRateEmbeddableSchema.validate(invalidState)).toThrow();
    });
  });

  describe('transforms', () => {
    it('should register transforms that handle legacy state', () => {
      registerBurnRateEmbeddableTransforms(embeddableSetupMock);

      const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
      const { getTransforms: getTransformsFromSetup } = callArgs[1];
      const transforms = getTransformsFromSetup!({} as any);

      expect(transforms).toHaveProperty('transformOut');
      expect(typeof transforms.transformOut).toBe('function');
    });

    it('should transform legacy state to new format', () => {
      registerBurnRateEmbeddableTransforms(embeddableSetupMock);

      const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
      const { getTransforms: getTransformsFromSetup } = callArgs[1];
      const transforms = getTransformsFromSetup!({} as any);

      const legacyState = {
        sloId: 'legacy-slo-id',
        sloInstanceId: 'legacy-instance-id',
        duration: '1h',
        title: 'Test Title',
      };

      const transformed = (transforms as any).transformOut(legacyState as any);

      expect(transformed).toMatchObject({
        slo_id: 'legacy-slo-id',
        slo_instance_id: 'legacy-instance-id',
        duration: '1h',
        title: 'Test Title',
      });
    });

    it('should return state unchanged when no legacy fields are present', () => {
      registerBurnRateEmbeddableTransforms(embeddableSetupMock);

      const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
      const { getTransforms: getTransformsFromSetup } = callArgs[1];
      const transforms = getTransformsFromSetup!({} as any);

      const newState = {
        slo_id: 'new-slo-id',
        slo_instance_id: 'new-instance-id',
        duration: '1h',
        title: 'Test Title',
      };

      const transformed = (transforms as any).transformOut(newState as any);

      expect(transformed).toEqual(newState);
    });
  });
});
