/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { setAttackStatusStepDefinition } from './set_attack_status_step';
import { DETECTION_ENGINE_ATTACKS_STATUS_URL } from '../../../../common/constants';
import type { setAttackStatusInputSchema } from '../../../../common/workflows/step_types/set_attack_status_step/set_attack_status_step_common';

describe('setAttackStatusStepDefinition', () => {
  let mockContextManager: jest.Mocked<
    StepHandlerContext<typeof setAttackStatusInputSchema>['contextManager']
  >;
  let mockContext: StepHandlerContext<typeof setAttackStatusInputSchema>;

  beforeEach(() => {
    mockContextManager = {
      callKibanaApi: jest.fn(),
      getFakeRequest: jest.fn(),
    } as unknown as jest.Mocked<
      StepHandlerContext<typeof setAttackStatusInputSchema>['contextManager']
    >;

    mockContext = {
      input: {
        ids: 'attack-1',
        status: 'open',
        update_related_alerts: false,
      },
      contextManager: mockContextManager,
    } as unknown as StepHandlerContext<typeof setAttackStatusInputSchema>;
  });

  it('successfully calls API with single ID and open status', async () => {
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { items: [] },
    });

    const result = await setAttackStatusStepDefinition.handler(mockContext);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: DETECTION_ENGINE_ATTACKS_STATUS_URL,
      body: {
        ids: ['attack-1'],
        status: 'open',
        update_related_alerts: false,
      },
    });

    expect(result.output).toEqual({
      success: true,
      message: 'Successfully updated status to open for 1 attack(s)',
    });
  });

  it('successfully calls API with array of IDs and closed status with reason', async () => {
    mockContext.input = {
      ids: ['attack-1', 'attack-2'],
      status: 'closed',
      reason: 'false_positive',
      update_related_alerts: false,
    };

    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { items: [] },
    });

    const result = await setAttackStatusStepDefinition.handler(mockContext);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: DETECTION_ENGINE_ATTACKS_STATUS_URL,
      body: {
        ids: ['attack-1', 'attack-2'],
        status: 'closed',
        reason: 'false_positive',
        update_related_alerts: false,
      },
    });

    expect(result.output).toEqual({
      success: true,
      message: 'Successfully updated status to closed for 2 attack(s)',
    });
  });

  it('successfully calls API with update_related_alerts flag', async () => {
    mockContext.input = {
      ids: ['attack-1'],
      status: 'acknowledged',
      update_related_alerts: true,
    };

    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { items: [] },
    });

    const result = await setAttackStatusStepDefinition.handler(mockContext);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: DETECTION_ENGINE_ATTACKS_STATUS_URL,
      body: {
        ids: ['attack-1'],
        status: 'acknowledged',
        update_related_alerts: true,
      },
    });

    expect(result.output).toEqual({
      success: true,
      message: 'Successfully updated status to acknowledged for 1 attack(s)',
    });
  });

  it('persists only status (not the raw body/headers) when callKibanaApi throws on a non-2xx', async () => {
    mockContextManager.callKibanaApi.mockRejectedValue(
      new KibanaApiCallError({
        status: 500,
        headers: { 'x-leaky-header': 'header-value' },
        body: { sensitive: 'partial-success-payload', items: [{ id: 'attack-1' }] },
        message: 'HTTP 500: bulk action partially failed',
      })
    );

    const error = await setAttackStatusStepDefinition
      .handler(mockContext)
      .then(() => undefined)
      .catch((e) => e);

    expect(error).toBeInstanceOf(ExecutionError);
    const serialized = (error as ExecutionError).toSerializableObject();
    expect(serialized.type).toBe('ApiError');
    expect(serialized.details).toEqual({ status: 500 });
    expect(JSON.stringify(serialized.details)).not.toContain('partial-success-payload');
    expect(JSON.stringify(serialized.details)).not.toContain('x-leaky-header');
  });

  it('wraps generic errors in ExecutionError', async () => {
    mockContextManager.callKibanaApi.mockRejectedValue(new Error('Network error'));

    await expect(setAttackStatusStepDefinition.handler(mockContext)).rejects.toMatchObject({
      type: 'ApiError',
      message: 'Network error',
    });
  });
});
