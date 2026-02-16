/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';
import { SLO_ERROR_BUDGET_ID } from '../../../common/embeddables/error_budget/constants';
import { ErrorBudgetEmbeddableSchema } from './schema';
import { getTransforms } from '../../../common/embeddables/error_budget/transforms/transforms';
import { registerErrorBudgetEmbeddableTransforms } from './register_error_budget_embeddable_transforms';

describe('registerErrorBudgetEmbeddableTransforms', () => {
  let embeddableSetupMock: ReturnType<typeof createEmbeddableSetupMock>;

  beforeEach(() => {
    embeddableSetupMock = createEmbeddableSetupMock();
  });

  it('should register transforms with correct embeddable type ID', () => {
    registerErrorBudgetEmbeddableTransforms(embeddableSetupMock);

    expect(embeddableSetupMock.registerTransforms).toHaveBeenCalledTimes(1);
    expect(embeddableSetupMock.registerTransforms).toHaveBeenCalledWith(
      SLO_ERROR_BUDGET_ID,
      expect.objectContaining({
        getSchema: expect.any(Function),
        getTransforms: expect.any(Function),
      })
    );
  });

  it('should register the correct schema', () => {
    registerErrorBudgetEmbeddableTransforms(embeddableSetupMock);

    expect(embeddableSetupMock.registerTransforms).toHaveBeenCalledWith(
      SLO_ERROR_BUDGET_ID,
      expect.objectContaining({
        getSchema: expect.any(Function),
        getTransforms: expect.any(Function),
      })
    );

    // Extract the registered configuration object
    const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
    const config = callArgs[1] as any;
    const schema = config.getSchema(['VALUE_CLICK_TRIGGER']);

    expect(schema).toBe(ErrorBudgetEmbeddableSchema);
  });

  it('should register the correct transforms', () => {
    registerErrorBudgetEmbeddableTransforms(embeddableSetupMock);

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
    it('should validate a valid error budget state', () => {
      const validState = {
        slo_id: 'test-slo-id',
        slo_instance_id: 'test-instance-id',
        title: 'Test Title',
        hide_title: false,
      };

      expect(() => ErrorBudgetEmbeddableSchema.validate(validState)).not.toThrow();
      const result = ErrorBudgetEmbeddableSchema.validate(validState);
      expect(result).toMatchObject({
        slo_id: 'test-slo-id',
        slo_instance_id: 'test-instance-id',
      });
    });

    it('should validate error budget state with minimal required fields', () => {
      const minimalState = {
        slo_id: undefined,
        slo_instance_id: undefined,
      };

      expect(() => ErrorBudgetEmbeddableSchema.validate(minimalState)).not.toThrow();
    });

    it('should validate error budget state with only slo_id', () => {
      const stateWithOnlySloId = {
        slo_id: 'test-slo-id',
      };

      expect(() => ErrorBudgetEmbeddableSchema.validate(stateWithOnlySloId)).not.toThrow();
    });
  });

  describe('transforms', () => {
    it('should register transforms that handle legacy state', () => {
      registerErrorBudgetEmbeddableTransforms(embeddableSetupMock);

      const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
      const { getTransforms: getTransformsFromSetup } = callArgs[1];
      const transforms = getTransformsFromSetup!({} as any);

      expect(transforms).toHaveProperty('transformOut');
      expect(typeof transforms.transformOut).toBe('function');
    });

    it('should transform legacy state to new format', () => {
      registerErrorBudgetEmbeddableTransforms(embeddableSetupMock);

      const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
      const { getTransforms: getTransformsFromSetup } = callArgs[1];
      const transforms = getTransformsFromSetup!({} as any);

      const legacyState = {
        sloId: 'legacy-slo-id',
        sloInstanceId: 'legacy-instance-id',
        title: 'Test Title',
      };

      const transformed = (transforms as any).transformOut(legacyState as any);

      expect(transformed).toMatchObject({
        slo_id: 'legacy-slo-id',
        slo_instance_id: 'legacy-instance-id',
        title: 'Test Title',
      });
    });

    it('should return state unchanged when no legacy fields are present', () => {
      registerErrorBudgetEmbeddableTransforms(embeddableSetupMock);

      const callArgs = embeddableSetupMock.registerTransforms.mock.calls[0];
      const { getTransforms: getTransformsFromSetup } = callArgs[1];
      const transforms = getTransformsFromSetup!({} as any);

      const newState = {
        slo_id: 'new-slo-id',
        slo_instance_id: 'new-instance-id',
        title: 'Test Title',
      };

      const transformed = (transforms as any).transformOut(newState as any);

      expect(transformed).toEqual(newState);
    });
  });
});
