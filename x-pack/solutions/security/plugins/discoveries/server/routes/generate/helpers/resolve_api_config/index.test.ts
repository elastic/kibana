/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { resolveApiConfig } from '.';

const mockResolveConnectorDetails = jest.fn();

jest.mock('../../../../workflows/helpers/resolve_connector_details', () => ({
  resolveConnectorDetails: (...args: unknown[]) => mockResolveConnectorDetails(...args),
}));

describe('resolveApiConfig', () => {
  const mockActionsClient = { get: jest.fn() };
  const mockInference = { getConnectorById: jest.fn() };
  const mockGetActionsClientWithRequest = jest.fn().mockResolvedValue(mockActionsClient);
  const mockPluginsStart = {
    actions: { getActionsClientWithRequest: mockGetActionsClientWithRequest },
    inference: mockInference,
  };
  const mockGetStartServices = jest.fn().mockResolvedValue({
    coreStart: {},
    pluginsStart: mockPluginsStart,
  });
  const mockLogger = loggingSystemMock.createLogger();
  const mockRequest = {} as Parameters<typeof resolveApiConfig>[0]['request'];

  const baseApiConfig = {
    connector_id: 'test-connector-id',
    model: 'gpt-4',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockResolveConnectorDetails.mockResolvedValue({
      actionTypeId: '.inference',
      connectorName: 'Test Connector',
    });

    mockGetActionsClientWithRequest.mockResolvedValue(mockActionsClient);

    mockGetStartServices.mockResolvedValue({
      coreStart: {},
      pluginsStart: mockPluginsStart,
    });
  });

  it('returns apiConfig unchanged when action_type_id is already set', async () => {
    const apiConfig = { ...baseApiConfig, action_type_id: '.gen-ai' };

    const result = await resolveApiConfig({
      apiConfig,
      getStartServices: mockGetStartServices,
      logger: mockLogger,
      request: mockRequest,
    });

    expect(result).toBe(apiConfig);
    expect(mockGetStartServices).not.toHaveBeenCalled();
    expect(mockResolveConnectorDetails).not.toHaveBeenCalled();
  });

  it('resolves action_type_id via resolveConnectorDetails when action_type_id is empty string', async () => {
    const apiConfig = { ...baseApiConfig, action_type_id: '' };

    const result = await resolveApiConfig({
      apiConfig,
      getStartServices: mockGetStartServices,
      logger: mockLogger,
      request: mockRequest,
    });

    expect(result).toEqual({ ...apiConfig, action_type_id: '.inference' });
    expect(mockGetStartServices).toHaveBeenCalledTimes(1);
    expect(mockGetActionsClientWithRequest).toHaveBeenCalledWith(mockRequest);
    expect(mockResolveConnectorDetails).toHaveBeenCalledWith({
      actionsClient: mockActionsClient,
      connectorId: 'test-connector-id',
      inference: mockInference,
      logger: mockLogger,
      request: mockRequest,
    });
  });

  it('resolves action_type_id via resolveConnectorDetails when action_type_id is undefined', async () => {
    const apiConfig = { ...baseApiConfig };

    const result = await resolveApiConfig({
      apiConfig,
      getStartServices: mockGetStartServices,
      logger: mockLogger,
      request: mockRequest,
    });

    expect(result).toEqual({ ...apiConfig, action_type_id: '.inference' });
    expect(mockGetStartServices).toHaveBeenCalledTimes(1);
    expect(mockResolveConnectorDetails).toHaveBeenCalledTimes(1);
  });

  it('preserves all apiConfig fields in the returned object when resolving', async () => {
    const apiConfig = {
      action_type_id: '',
      connector_id: 'test-connector-id',
      model: 'gpt-4o',
      provider: 'openai',
    };

    const result = await resolveApiConfig({
      apiConfig,
      getStartServices: mockGetStartServices,
      logger: mockLogger,
      request: mockRequest,
    });

    expect(result).toEqual({
      ...apiConfig,
      action_type_id: '.inference',
    });
  });

  it('propagates error when resolveConnectorDetails throws', async () => {
    const apiConfig = { ...baseApiConfig, action_type_id: '' };

    mockResolveConnectorDetails.mockRejectedValue(
      new Error('Failed to resolve connector details for test-connector-id: Not found')
    );

    await expect(
      resolveApiConfig({
        apiConfig,
        getStartServices: mockGetStartServices,
        logger: mockLogger,
        request: mockRequest,
      })
    ).rejects.toThrow('Failed to resolve connector details');
  });
});
