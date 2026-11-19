/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
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

describe('useDefaultAIConnectorId', () => {
  const mockSettings = {};
  const mockHttp = {};
  const mockToasts = {};
  const mockConnectors = [
    { id: 'connector-1', name: 'Connector 1' },
    { id: 'connector-2', name: 'Connector 2' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

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
    mockUseKibana.mockReturnValue({
      services: {
        http: mockHttp,
        notifications: { toasts: mockToasts },
        settings: { client: { get: jest.fn().mockReturnValue('custom-inference-endpoint') } },
      },
    });
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
  });

  it('should return the endpoint the server flagged as default when the setting holds a stack connector alias', () => {
    const { getDefaultConnector: actualGetDefaultConnector } = jest.requireActual(
      '@kbn/elastic-assistant/impl/assistant/helpers'
    );
    mockGetDefaultConnector.mockImplementation(actualGetDefaultConnector);
    mockUseKibana.mockReturnValue({
      services: {
        http: mockHttp,
        notifications: { toasts: mockToasts },
        settings: { client: { get: jest.fn().mockReturnValue('.custom-stack-connector') } },
      },
    });
    mockUseLoadConnectors.mockReturnValue({
      data: [
        { id: 'Anthropic-Claude-Sonnet-3-7', name: 'Anthropic Claude Sonnet 3.7' },
        {
          id: 'custom-inference-endpoint',
          name: 'custom-inference-endpoint',
          isInferenceEndpoint: true,
          isDefault: true,
        },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.defaultConnectorId).toBe('custom-inference-endpoint');
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
});
