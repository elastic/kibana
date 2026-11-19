/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useDefaultAIConnectorId } from './use_default_ai_connector_id';
import { useResolveConnectorAlias } from './use_resolve_connector_alias';
import { useKibana } from '../lib/kibana';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { getDefaultConnector } from '@kbn/elastic-assistant/impl/assistant/helpers';

jest.mock('../lib/kibana');
jest.mock('./use_resolve_connector_alias');
jest.mock('@kbn/inference-connectors');
jest.mock('@kbn/elastic-assistant/impl/assistant/helpers');

const mockUseKibana = useKibana as jest.Mock;
const mockUseResolveConnectorAlias = useResolveConnectorAlias as jest.Mock;
const mockUseLoadConnectors = useLoadConnectors as jest.Mock;
const mockGetDefaultConnector = getDefaultConnector as jest.Mock;

describe('useDefaultAIConnectorId', () => {
  const mockHttp = {};
  const mockToasts = {};
  const mockConnectors = [
    { id: 'connector-1', name: 'Connector 1' },
    { id: 'connector-2', name: 'Connector 2' },
  ];
  let mockSettingsGet: jest.Mock;
  let mockSettings: { client: { get: jest.Mock } };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSettingsGet = jest.fn().mockReturnValue(undefined);
    mockSettings = { client: { get: mockSettingsGet } };

    mockUseKibana.mockReturnValue({
      services: {
        http: mockHttp,
        notifications: { toasts: mockToasts },
        settings: mockSettings,
      },
    });

    mockUseLoadConnectors.mockReturnValue({
      data: mockConnectors,
      isLoading: false,
    });

    mockUseResolveConnectorAlias.mockReturnValue({
      resolvedConnectorId: undefined,
      isResolving: false,
    });

    mockGetDefaultConnector.mockReturnValue({ id: 'connector-id' });
  });

  it('should return connector id from getDefaultConnector', () => {
    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.defaultConnectorId).toBe('connector-id');
  });

  it('should return undefined when getDefaultConnector returns undefined', () => {
    mockGetDefaultConnector.mockReturnValue(undefined);

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.defaultConnectorId).toBeUndefined();
  });

  it('should return undefined when getDefaultConnector returns null', () => {
    mockGetDefaultConnector.mockReturnValue(null);

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.defaultConnectorId).toBeUndefined();
  });

  it('should call getDefaultConnector with correct parameters', () => {
    renderHook(() => useDefaultAIConnectorId());

    expect(mockGetDefaultConnector).toHaveBeenCalledWith(mockConnectors, mockSettings);
  });

  it('should load the connectors from the alert_ai_summary inference feature, reporting load errors through toasts, so that inference endpoints are included', () => {
    renderHook(() => useDefaultAIConnectorId());

    expect(mockUseLoadConnectors).toHaveBeenCalledWith({
      http: mockHttp,
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

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.defaultConnectorId).toBe('custom-inference-endpoint');
    expect(mockUseResolveConnectorAlias).toHaveBeenCalledWith({
      connectorId: 'custom-inference-endpoint',
      enabled: false,
    });
  });

  it('should return isLoading true when connectors are loading', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: mockConnectors,
      isLoading: true,
    });

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.isLoading).toBe(true);
  });

  it('should return isLoading false when connectors are not loading', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: mockConnectors,
      isLoading: false,
    });

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.isLoading).toBe(false);
  });

  describe('alias lookup', () => {
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

    it('should look the alias up when no entry matches the default setting', () => {
      renderHook(() => useDefaultAIConnectorId());

      expect(mockUseResolveConnectorAlias).toHaveBeenCalledWith({
        connectorId: aliasId,
        enabled: true,
      });
    });

    it('should return the endpoint the alias resolves to', () => {
      mockUseResolveConnectorAlias.mockReturnValue({
        resolvedConnectorId: 'custom-inference-endpoint',
        isResolving: false,
      });

      const { result } = renderHook(() => useDefaultAIConnectorId());

      expect(result.current.defaultConnectorId).toBe('custom-inference-endpoint');
    });

    it('should report loading while the alias is being resolved', () => {
      mockUseResolveConnectorAlias.mockReturnValue({
        resolvedConnectorId: undefined,
        isResolving: true,
      });

      const { result } = renderHook(() => useDefaultAIConnectorId());

      expect(result.current.isLoading).toBe(true);
    });

    it('should fall back to the priority pick when the alias cannot be resolved', () => {
      const { result } = renderHook(() => useDefaultAIConnectorId());

      expect(result.current.defaultConnectorId).toBe('Anthropic-Claude-Sonnet-3-7');
    });

    it('should fall back when the resolved endpoint is not in the list', () => {
      mockUseResolveConnectorAlias.mockReturnValue({
        resolvedConnectorId: 'not-in-the-list',
        isResolving: false,
      });

      const { result } = renderHook(() => useDefaultAIConnectorId());

      expect(result.current.defaultConnectorId).toBe('Anthropic-Claude-Sonnet-3-7');
    });

    it('should not look the alias up before the connectors have loaded', () => {
      mockUseLoadConnectors.mockReturnValue({ data: undefined, isLoading: true });

      renderHook(() => useDefaultAIConnectorId());

      expect(mockUseResolveConnectorAlias).toHaveBeenCalledWith({
        connectorId: aliasId,
        enabled: false,
      });
    });

    it.each(['NO_DEFAULT_CONNECTOR', 'NO_DEFAULT_MODEL'])(
      'should not look anything up when the setting is %s',
      (sentinel) => {
        mockSettingsGet.mockReturnValue(sentinel);

        renderHook(() => useDefaultAIConnectorId());

        expect(mockUseResolveConnectorAlias).toHaveBeenCalledWith({
          connectorId: sentinel,
          enabled: false,
        });
      }
    );
  });
});
