/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { InitializationFlowId } from '../../../common/api/initialization';
import {
  INITIALIZATION_FLOW_CREATE_LIST_INDICES,
  INITIALIZATION_FLOW_STATUS_READY,
  INITIALIZATION_FLOW_STATUS_ERROR,
} from '../../../common/api/initialization';
import type { InitializationFlowContext } from './types';
import { FlowInitializationError, runInitializationFlows } from './flow_registry';

jest.mock('./flows/create_list_indices', () => ({
  createListIndicesInitializationFlow: {
    id: 'create-list-indices',
    resolveProvisionContext: jest.fn().mockResolvedValue({}),
    provision: jest.fn().mockResolvedValue({ status: 'ready' as const, payload: null }),
  },
}));

const createMockContext = (): InitializationFlowContext =>
  ({
    requestHandlerContext: {},
  } as unknown as InitializationFlowContext);

describe('runInitializationFlows', () => {
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    logger = loggerMock.create();
    jest.clearAllMocks();
  });

  const flowA = INITIALIZATION_FLOW_CREATE_LIST_INDICES;

  it('runs a registered flow and returns its result', async () => {
    const context = createMockContext();
    const response = await runInitializationFlows([flowA], context, logger);

    expect(response.flows[flowA]).toEqual({
      status: INITIALIZATION_FLOW_STATUS_READY,
      payload: null,
    });
  });

  it('resolves the provision context before calling provision', async () => {
    const { createListIndicesInitializationFlow } = jest.requireMock('./flows/create_list_indices');
    const mockProvisionContext = { internalListClient: {} };
    createListIndicesInitializationFlow.resolveProvisionContext.mockResolvedValueOnce(
      mockProvisionContext
    );

    const context = createMockContext();
    await runInitializationFlows([flowA], context, logger);

    expect(createListIndicesInitializationFlow.resolveProvisionContext).toHaveBeenCalledWith(
      context,
      logger
    );
    expect(createListIndicesInitializationFlow.provision).toHaveBeenCalledWith(
      mockProvisionContext,
      logger
    );
  });

  it('returns an error for an unregistered flow', async () => {
    const nonExistingFlow = 'non-existing-flow' as InitializationFlowId;
    const context = createMockContext();
    const response = await runInitializationFlows([nonExistingFlow], context, logger);

    expect(response.flows[nonExistingFlow]).toEqual({
      status: INITIALIZATION_FLOW_STATUS_ERROR,
      error: `Initialization flow '${nonExistingFlow}' is not registered`,
    });
  });

  it('returns an empty flows object when given an empty array', async () => {
    const context = createMockContext();
    const response = await runInitializationFlows([], context, logger);
    expect(response).toEqual({ flows: {} });
  });

  describe('error handling', () => {
    it('exposes the message from a FlowInitializationError', async () => {
      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );
      createListIndicesInitializationFlow.resolveProvisionContext.mockRejectedValueOnce(
        new FlowInitializationError('lists plugin is not available')
      );

      const context = createMockContext();
      const response = await runInitializationFlows([flowA], context, logger);

      expect(response.flows[flowA]).toEqual({
        status: INITIALIZATION_FLOW_STATUS_ERROR,
        error: 'lists plugin is not available',
      });
      expect(logger.error).toHaveBeenCalledWith(
        "Initialization flow 'create-list-indices' failed: lists plugin is not available"
      );
    });

    it('returns an opaque error message for unexpected errors from resolveProvisionContext', async () => {
      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );
      createListIndicesInitializationFlow.resolveProvisionContext.mockRejectedValueOnce(
        new Error('ES connection failed')
      );

      const context = createMockContext();
      const response = await runInitializationFlows([flowA], context, logger);

      expect(response.flows[flowA]).toEqual({
        status: INITIALIZATION_FLOW_STATUS_ERROR,
        error: 'internal initialization flow error',
      });
      expect(logger.error).toHaveBeenCalledWith(
        "Initialization flow 'create-list-indices' failed: ES connection failed"
      );
    });

    it('returns an opaque error message for unexpected errors from provision', async () => {
      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );
      createListIndicesInitializationFlow.provision.mockRejectedValueOnce(
        new Error('cluster unavailable')
      );

      const context = createMockContext();
      const response = await runInitializationFlows([flowA], context, logger);

      expect(response.flows[flowA]).toEqual({
        status: INITIALIZATION_FLOW_STATUS_ERROR,
        error: 'internal initialization flow error',
      });
      expect(logger.error).toHaveBeenCalledWith(
        "Initialization flow 'create-list-indices' failed: cluster unavailable"
      );
    });
  });

  it('runs multiple flows and returns all results', async () => {
    const { createListIndicesInitializationFlow } = jest.requireMock('./flows/create_list_indices');
    const nonExistingFlow = 'non-existing-flow' as InitializationFlowId;

    createListIndicesInitializationFlow.provision.mockResolvedValueOnce({
      status: INITIALIZATION_FLOW_STATUS_READY,
      payload: null,
    });

    const context = createMockContext();
    const response = await runInitializationFlows([flowA, nonExistingFlow], context, logger);

    expect(response.flows[flowA]).toEqual({
      status: INITIALIZATION_FLOW_STATUS_READY,
      payload: null,
    });
    expect(response.flows[nonExistingFlow]).toEqual({
      status: INITIALIZATION_FLOW_STATUS_ERROR,
      error: `Initialization flow '${nonExistingFlow}' is not registered`,
    });
  });
});
