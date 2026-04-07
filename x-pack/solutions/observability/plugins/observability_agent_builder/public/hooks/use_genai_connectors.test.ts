/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { AIConnector } from '@kbn/inference-connectors';
import { useGenAIConnectors } from './use_genai_connectors';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana');

const mockUseLoadConnectors = jest.fn();
jest.mock('@kbn/inference-connectors', () => ({
  useLoadConnectors: (...args: unknown[]) => mockUseLoadConnectors(...args),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockHttp = {};
const mockSettings = {};

const mockConnectors: AIConnector[] = [
  {
    id: 'connector-1',
    name: 'OpenAI Connector',
    actionTypeId: '.gen-ai',
    config: {},
    secrets: {},
    isPreconfigured: false,
    isSystemAction: false,
    isDeprecated: false,
    isConnectorTypeDeprecated: false,
    isMissingSecrets: false,
  },
  {
    id: 'connector-2',
    name: 'Bedrock Connector',
    actionTypeId: '.bedrock',
    config: {},
    secrets: {},
    isPreconfigured: false,
    isSystemAction: false,
    isDeprecated: false,
    isConnectorTypeDeprecated: false,
    isMissingSecrets: false,
  },
];

const mockRefetch = jest.fn();

describe('useGenAIConnectors', () => {
  beforeEach(() => {
    mockUseLoadConnectors.mockReset();
    mockUseKibana.mockReturnValue({
      services: {
        http: mockHttp,
        settings: mockSettings,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls useLoadConnectors with the correct featureId', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: mockConnectors,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    const { unmount } = renderHook(() => useGenAIConnectors());

    expect(mockUseLoadConnectors).toHaveBeenCalledWith({
      http: mockHttp,
      featureId: 'observability_ai_insights_inference_subfeature',
      settings: mockSettings,
    });

    unmount();
  });

  it('should fetch connectors and set hasConnectors to true when connectors exist', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: mockConnectors,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    const { result, unmount } = renderHook(() => useGenAIConnectors());

    expect(result.current.connectors).toEqual(mockConnectors);
    expect(result.current.hasConnectors).toBe(true);
    expect(result.current.loading).toBe(false);

    unmount();
  });

  it('should set hasConnectors to false when no connectors exist', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    const { result, unmount } = renderHook(() => useGenAIConnectors());

    expect(result.current.connectors).toEqual([]);
    expect(result.current.hasConnectors).toBe(false);

    unmount();
  });

  it('should show loading state', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });
    const { result, unmount } = renderHook(() => useGenAIConnectors());

    expect(result.current.loading).toBe(true);
    expect(result.current.connectors).toEqual([]);
    expect(result.current.hasConnectors).toBe(false);

    unmount();
  });

  it('should handle API errors', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API failed'),
      refetch: mockRefetch,
    });
    const { result, unmount } = renderHook(() => useGenAIConnectors());

    expect(result.current.connectors).toEqual([]);
    expect(result.current.hasConnectors).toBe(false);

    unmount();
  });
});
