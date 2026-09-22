/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { resolveScopedModel } from './scoped_model';

const logger = loggingSystemMock.createLogger();

const mockRequest = {} as KibanaRequest;

const mockUiSettingsClient = {
  get: jest.fn().mockResolvedValue(undefined),
};

const mockChatModel = { invoke: jest.fn() };
const mockInferenceClient = {};
const mockConnector = { connectorId: 'test-connector', name: 'Test', actionTypeId: '.gen-ai' };

const mockScopedModel = {
  connector: mockConnector,
  chatModel: mockChatModel,
  inferenceClient: mockInferenceClient,
};

const mockInference = {
  getDefaultConnector: jest.fn(),
  getChatModel: jest.fn().mockResolvedValue(mockChatModel),
  getClient: jest.fn().mockReturnValue(mockInferenceClient),
  getConnectorById: jest.fn().mockResolvedValue(mockConnector),
};

const mockSearchInferenceEndpoints = {
  endpoints: {
    getForFeature: jest.fn(),
  },
};

const featureId = 'alertzero_reasoning';

beforeEach(() => {
  jest.clearAllMocks();
  mockUiSettingsClient.get.mockResolvedValue(undefined);
  mockInference.getDefaultConnector.mockResolvedValue(undefined);
  mockSearchInferenceEndpoints.endpoints.getForFeature.mockResolvedValue({ endpoints: [] });
});

describe('resolveScopedModel', () => {
  it('returns no_inference_plugin when inference is absent', async () => {
    const result = await resolveScopedModel({
      inference: undefined,
      featureId,
      request: mockRequest,
      uiSettingsClient: mockUiSettingsClient as never,
      logger,
    });
    expect(result).toEqual({ ok: false, reason: 'no_inference_plugin', message: expect.any(String) });
  });

  it('resolves via tier connector when available', async () => {
    mockSearchInferenceEndpoints.endpoints.getForFeature.mockResolvedValue({
      endpoints: [{ connectorId: 'tier-connector' }],
    });

    const result = await resolveScopedModel({
      inference: mockInference as never,
      searchInferenceEndpoints: mockSearchInferenceEndpoints as never,
      featureId,
      request: mockRequest,
      uiSettingsClient: mockUiSettingsClient as never,
      logger,
    });

    expect(result.ok).toBe(true);
    expect(mockInference.getConnectorById).toHaveBeenCalledWith('tier-connector', mockRequest);
  });

  it('falls through to genAI default when no tier connector', async () => {
    mockInference.getDefaultConnector.mockResolvedValue({ connectorId: 'default-connector' });

    const result = await resolveScopedModel({
      inference: mockInference as never,
      searchInferenceEndpoints: mockSearchInferenceEndpoints as never,
      featureId,
      request: mockRequest,
      uiSettingsClient: mockUiSettingsClient as never,
      logger,
    });

    expect(result.ok).toBe(true);
    expect(mockInference.getConnectorById).toHaveBeenCalledWith('default-connector', mockRequest);
  });

  it('returns no_connector when all resolution steps fail', async () => {
    const result = await resolveScopedModel({
      inference: mockInference as never,
      featureId,
      request: mockRequest,
      uiSettingsClient: mockUiSettingsClient as never,
      logger,
    });

    expect(result).toEqual({ ok: false, reason: 'no_connector', message: expect.any(String) });
  });

  it('falls through when tier connector build throws', async () => {
    mockSearchInferenceEndpoints.endpoints.getForFeature.mockResolvedValue({
      endpoints: [{ connectorId: 'broken-connector' }],
    });
    mockInference.getChatModel.mockRejectedValueOnce(new Error('connector unavailable'));
    mockInference.getDefaultConnector.mockResolvedValue({ connectorId: 'fallback-connector' });

    const result = await resolveScopedModel({
      inference: mockInference as never,
      searchInferenceEndpoints: mockSearchInferenceEndpoints as never,
      featureId,
      request: mockRequest,
      uiSettingsClient: mockUiSettingsClient as never,
      logger,
    });

    expect(result.ok).toBe(true);
    expect(mockInference.getConnectorById).toHaveBeenCalledWith('fallback-connector', mockRequest);
  });
});
