/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useDefaultAIConnectorId } from './use_default_ai_connector_id';
import { useKibana } from '../lib/kibana';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { getDefaultConnector } from '@kbn/elastic-assistant/impl/assistant/helpers';

jest.mock('../lib/kibana');
jest.mock('@kbn/inference-connectors');
jest.mock('@kbn/elastic-assistant/impl/assistant/helpers');

const mockUseKibana = useKibana as jest.Mock;
const mockUseLoadConnectors = useLoadConnectors as jest.Mock;
const mockGetDefaultConnector = getDefaultConnector as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useDefaultAIConnectorId', () => {
  const mockToasts = {};
  const mockConnectors = [
    { id: 'connector-1', name: 'Connector 1' },
    { id: 'connector-2', name: 'Connector 2' },
  ];
  let mockHttpGet: jest.Mock;
  let mockSettingsGet: jest.Mock;
  let mockSettings: { client: { get: jest.Mock } };

  const renderUseDefaultAIConnectorId = () =>
    renderHook(() => useDefaultAIConnectorId(), { wrapper: createWrapper() });

  beforeEach(() => {
    jest.clearAllMocks();

    mockHttpGet = jest.fn();
    mockSettingsGet = jest.fn().mockReturnValue(undefined);
    mockSettings = { client: { get: mockSettingsGet } };

    mockUseKibana.mockReturnValue({
      services: {
        http: { get: mockHttpGet },
        notifications: { toasts: mockToasts },
        settings: mockSettings,
      },
    });

    mockUseLoadConnectors.mockReturnValue({
      data: mockConnectors,
      isLoading: false,
    });

    mockGetDefaultConnector.mockReturnValue({ id: 'connector-id' });
  });

  it('should return connector id from getDefaultConnector', () => {
    const { result } = renderUseDefaultAIConnectorId();

    expect(result.current.defaultConnectorId).toBe('connector-id');
  });

  it('should return undefined when getDefaultConnector returns undefined', () => {
    mockGetDefaultConnector.mockReturnValue(undefined);

    const { result } = renderUseDefaultAIConnectorId();

    expect(result.current.defaultConnectorId).toBeUndefined();
  });

  it('should return undefined when getDefaultConnector returns null', () => {
    mockGetDefaultConnector.mockReturnValue(null);

    const { result } = renderUseDefaultAIConnectorId();

    expect(result.current.defaultConnectorId).toBeUndefined();
  });

  it('should call getDefaultConnector with correct parameters', () => {
    renderUseDefaultAIConnectorId();

    expect(mockGetDefaultConnector).toHaveBeenCalledWith(mockConnectors, mockSettings);
  });

  it('should load the connectors from the alert_ai_summary inference feature, reporting load errors through toasts, so that inference endpoints are included', () => {
    renderUseDefaultAIConnectorId();

    expect(mockUseLoadConnectors).toHaveBeenCalledWith({
      http: { get: mockHttpGet },
      toasts: mockToasts,
      featureId: 'alert_ai_summary',
    });
  });

  it('should return the configured inference endpoint instead of the Elastic-managed connector', () => {
    const { getDefaultConnector: actualGetDefaultConnector } = jest.requireActual(
      '@kbn/elastic-assistant/impl/assistant/helpers'
    );
    mockGetDefaultConnector.mockImplementation(actualGetDefaultConnector);
    mockSettingsGet.mockReturnValue('custom-inference-endpoint');
    mockUseLoadConnectors.mockReturnValue({
      data: [
        { id: 'Anthropic-Claude-Sonnet-3-7', name: 'Anthropic Claude Sonnet 3.7' },
        {
          id: 'custom-inference-endpoint',
          name: 'custom-inference-endpoint',
          isInferenceEndpoint: true,
        },
      ],
      isLoading: false,
    });

    const { result } = renderUseDefaultAIConnectorId();

    expect(result.current.defaultConnectorId).toBe('custom-inference-endpoint');
    expect(mockHttpGet).not.toHaveBeenCalled();
  });

  it('should return isLoading true when connectors are loading', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: mockConnectors,
      isLoading: true,
    });

    const { result } = renderUseDefaultAIConnectorId();

    expect(result.current.isLoading).toBe(true);
  });

  it('should return isLoading false when connectors are not loading', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: mockConnectors,
      isLoading: false,
    });

    const { result } = renderUseDefaultAIConnectorId();

    expect(result.current.isLoading).toBe(false);
  });

  describe('when the default setting is a stack connector alias of an inference endpoint', () => {
    const aliasId = '.custom-stack-connector';
    const connectorsWithEndpoint = [
      { id: 'Anthropic-Claude-Sonnet-3-7', name: 'Anthropic Claude Sonnet 3.7' },
      {
        id: 'custom-inference-endpoint',
        name: 'custom-inference-endpoint',
        isInferenceEndpoint: true,
      },
    ];

    beforeEach(() => {
      const { getDefaultConnector: actualGetDefaultConnector } = jest.requireActual(
        '@kbn/elastic-assistant/impl/assistant/helpers'
      );
      mockGetDefaultConnector.mockImplementation(actualGetDefaultConnector);
      mockSettingsGet.mockReturnValue(aliasId);
      mockUseLoadConnectors.mockReturnValue({ data: connectorsWithEndpoint, isLoading: false });
    });

    it('should resolve the alias on the server and return the endpoint it points to', async () => {
      mockHttpGet.mockResolvedValue({ connector: { connectorId: 'custom-inference-endpoint' } });

      const { result } = renderUseDefaultAIConnectorId();

      await waitFor(() =>
        expect(result.current.defaultConnectorId).toBe('custom-inference-endpoint')
      );
      expect(mockHttpGet).toHaveBeenCalledWith(
        `/internal/inference/connectors/${encodeURIComponent(aliasId)}`
      );
    });

    it('should report loading while the alias is being resolved', async () => {
      mockHttpGet.mockResolvedValue({ connector: { connectorId: 'custom-inference-endpoint' } });

      const { result } = renderUseDefaultAIConnectorId();

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('should fall back to the priority pick when the alias cannot be resolved', async () => {
      mockHttpGet.mockRejectedValue(new Error('Not found'));

      const { result } = renderUseDefaultAIConnectorId();

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.defaultConnectorId).toBe('Anthropic-Claude-Sonnet-3-7');
    });

    it('should fall back when the resolved endpoint is not in the list', async () => {
      mockHttpGet.mockResolvedValue({ connector: { connectorId: 'not-in-the-list' } });

      const { result } = renderUseDefaultAIConnectorId();

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.defaultConnectorId).toBe('Anthropic-Claude-Sonnet-3-7');
    });

    it('should not look the alias up before the connectors have loaded', () => {
      mockUseLoadConnectors.mockReturnValue({ data: undefined, isLoading: true });

      renderUseDefaultAIConnectorId();

      expect(mockHttpGet).not.toHaveBeenCalled();
    });

    it('should not look anything up when no default is configured', () => {
      mockSettingsGet.mockReturnValue('NO_DEFAULT_CONNECTOR');

      renderUseDefaultAIConnectorId();

      expect(mockHttpGet).not.toHaveBeenCalled();
    });
  });
});
