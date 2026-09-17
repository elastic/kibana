/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';

import { resolveDefaultConnectorId } from '.';

describe('resolveDefaultConnectorId', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const mockRequest = {} as KibanaRequest;

  const mockUiSettingsGet = jest.fn();
  const mockUiSettingsClient = {
    get: mockUiSettingsGet,
  } as unknown as IUiSettingsClient;

  const mockGetDefaultConnector = jest.fn();
  const mockInference = {
    getDefaultConnector: mockGetDefaultConnector,
  } as unknown as InferenceServerStart;

  const mockFeaturesGet = jest.fn();
  const mockGetForFeature = jest.fn();
  const mockSearchInferenceEndpoints = {
    endpoints: { getForFeature: mockGetForFeature },
    features: { get: mockFeaturesGet },
  } as unknown as SearchInferenceEndpointsPluginStart;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when featureId names a registered chat completion feature', () => {
    beforeEach(() => {
      mockFeaturesGet.mockReturnValue({ taskType: 'chat_completion' });
      mockGetForFeature.mockResolvedValue({ endpoints: [{ connectorId: 'tier-connector' }] });
      mockUiSettingsGet.mockResolvedValue('configured-connector');
    });

    it('returns the connector configured for the feature', async () => {
      const result = await resolveDefaultConnectorId({
        featureId: 'alertzero_generation',
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
        searchInferenceEndpoints: mockSearchInferenceEndpoints,
        uiSettingsClient: mockUiSettingsClient,
      });

      expect(result).toBe('tier-connector');
    });

    it('passes the request to getForFeature', async () => {
      await resolveDefaultConnectorId({
        featureId: 'alertzero_generation',
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
        searchInferenceEndpoints: mockSearchInferenceEndpoints,
        uiSettingsClient: mockUiSettingsClient,
      });

      expect(mockGetForFeature).toHaveBeenCalledWith('alertzero_generation', mockRequest);
    });

    // The tier is deliberately above the cluster-wide default in the resolution
    // order, so a configured default must not win over an operator's tier choice.
    it('takes precedence over genAiSettings:defaultAIConnector', async () => {
      await resolveDefaultConnectorId({
        featureId: 'alertzero_generation',
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
        searchInferenceEndpoints: mockSearchInferenceEndpoints,
        uiSettingsClient: mockUiSettingsClient,
      });

      expect(mockUiSettingsGet).not.toHaveBeenCalled();
    });
  });

  // A tier belonging to a disabled plugin is never registered, which is the common
  // case rather than an edge one. Deferring to `getForFeature` there would shadow
  // the configured default with its own fallbacks.
  describe('when featureId is not usable', () => {
    beforeEach(() => {
      mockUiSettingsGet.mockResolvedValue('configured-connector');
    });

    it('falls through to the configured default when the feature is not registered', async () => {
      mockFeaturesGet.mockReturnValue(undefined);

      const result = await resolveDefaultConnectorId({
        featureId: 'alertzero_generation',
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
        searchInferenceEndpoints: mockSearchInferenceEndpoints,
        uiSettingsClient: mockUiSettingsClient,
      });

      expect(result).toBe('configured-connector');
    });

    it('does not call getForFeature when the feature is not registered', async () => {
      mockFeaturesGet.mockReturnValue(undefined);

      await resolveDefaultConnectorId({
        featureId: 'alertzero_generation',
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
        searchInferenceEndpoints: mockSearchInferenceEndpoints,
        uiSettingsClient: mockUiSettingsClient,
      });

      expect(mockGetForFeature).not.toHaveBeenCalled();
    });

    it('falls through when the searchInferenceEndpoints plugin is unavailable', async () => {
      const result = await resolveDefaultConnectorId({
        featureId: 'alertzero_generation',
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
        uiSettingsClient: mockUiSettingsClient,
      });

      expect(result).toBe('configured-connector');
    });

    it('falls through when the feature is not a chat completion feature', async () => {
      mockFeaturesGet.mockReturnValue({ taskType: 'text_embedding' });

      const result = await resolveDefaultConnectorId({
        featureId: 'alertzero_generation',
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
        searchInferenceEndpoints: mockSearchInferenceEndpoints,
        uiSettingsClient: mockUiSettingsClient,
      });

      expect(result).toBe('configured-connector');
    });

    it('warns when the feature is not a chat completion feature', async () => {
      mockFeaturesGet.mockReturnValue({ taskType: 'text_embedding' });

      await resolveDefaultConnectorId({
        featureId: 'alertzero_generation',
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
        searchInferenceEndpoints: mockSearchInferenceEndpoints,
        uiSettingsClient: mockUiSettingsClient,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Ignoring feature_id alertzero_generation: task type is text_embedding, not chat_completion'
      );
    });

    it('falls through when the feature resolves no endpoints', async () => {
      mockFeaturesGet.mockReturnValue({ taskType: 'chat_completion' });
      mockGetForFeature.mockResolvedValue({ endpoints: [] });

      const result = await resolveDefaultConnectorId({
        featureId: 'alertzero_generation',
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
        searchInferenceEndpoints: mockSearchInferenceEndpoints,
        uiSettingsClient: mockUiSettingsClient,
      });

      expect(result).toBe('configured-connector');
    });
  });

  describe('when genAiSettings:defaultAIConnector is configured', () => {
    beforeEach(() => {
      mockUiSettingsGet.mockResolvedValue('configured-connector');
    });

    it('returns the configured default connector id', async () => {
      const result = await resolveDefaultConnectorId({
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
        uiSettingsClient: mockUiSettingsClient,
      });

      expect(result).toBe('configured-connector');
    });

    it('reads the genAiSettings:defaultAIConnector setting', async () => {
      await resolveDefaultConnectorId({
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
        uiSettingsClient: mockUiSettingsClient,
      });

      expect(mockUiSettingsGet).toHaveBeenCalledWith(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
    });

    it('does not fall back to inference.getDefaultConnector', async () => {
      await resolveDefaultConnectorId({
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
        uiSettingsClient: mockUiSettingsClient,
      });

      expect(mockGetDefaultConnector).not.toHaveBeenCalled();
    });
  });

  describe('when genAiSettings:defaultAIConnector is the NO_DEFAULT_CONNECTOR sentinel', () => {
    beforeEach(() => {
      mockUiSettingsGet.mockResolvedValue('NO_DEFAULT_CONNECTOR');
      mockGetDefaultConnector.mockResolvedValue({
        connectorId: 'inference-connector',
        name: 'Inference Connector',
        type: '.inference',
      });
    });

    it('treats the sentinel as unset and falls back to inference.getDefaultConnector', async () => {
      const result = await resolveDefaultConnectorId({
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
        uiSettingsClient: mockUiSettingsClient,
      });

      expect(result).toBe('inference-connector');
    });

    it('passes the request to inference.getDefaultConnector', async () => {
      await resolveDefaultConnectorId({
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
        uiSettingsClient: mockUiSettingsClient,
      });

      expect(mockGetDefaultConnector).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe('when genAiSettings:defaultAIConnector is empty', () => {
    beforeEach(() => {
      mockUiSettingsGet.mockResolvedValue('');
      mockGetDefaultConnector.mockResolvedValue({
        connectorId: 'inference-connector',
        name: 'Inference Connector',
        type: '.inference',
      });
    });

    it('falls back to inference.getDefaultConnector', async () => {
      const result = await resolveDefaultConnectorId({
        inference: mockInference,
        logger: mockLogger,
        request: mockRequest,
        uiSettingsClient: mockUiSettingsClient,
      });

      expect(result).toBe('inference-connector');
    });
  });

  describe('when no default can be resolved', () => {
    beforeEach(() => {
      mockUiSettingsGet.mockResolvedValue('NO_DEFAULT_CONNECTOR');
    });

    it('throws when inference returns no default connector', async () => {
      mockGetDefaultConnector.mockResolvedValue(undefined);

      await expect(
        resolveDefaultConnectorId({
          inference: mockInference,
          logger: mockLogger,
          request: mockRequest,
          uiSettingsClient: mockUiSettingsClient,
        })
      ).rejects.toThrow('Unable to resolve a default AI connector');
    });

    it('throws when inference is not available', async () => {
      await expect(
        resolveDefaultConnectorId({
          logger: mockLogger,
          request: mockRequest,
          uiSettingsClient: mockUiSettingsClient,
        })
      ).rejects.toThrow('Unable to resolve a default AI connector');
    });
  });
});
