/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';

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

  beforeEach(() => {
    jest.clearAllMocks();
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
