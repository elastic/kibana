/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { AIConnector } from '@kbn/inference-connectors';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { useGenAIConnectors } from './use_genai_connectors';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana');
jest.mock('@kbn/inference-connectors', () => ({
  useLoadConnectors: jest.fn(),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockUseLoadConnectors = useLoadConnectors as jest.Mock;

const mockAIConnectors: AIConnector[] = [
  {
    id: 'connector-1',
    name: 'OpenAI Connector',
    actionTypeId: '.gen-ai',
    config: {},
    isPreconfigured: false,
    isEis: false,
    isDeprecated: false,
    isConnectorTypeDeprecated: false,
    isMissingSecrets: false,
  } as AIConnector,
  {
    id: 'connector-2',
    name: 'Bedrock Connector',
    actionTypeId: '.bedrock',
    config: {},
    isPreconfigured: false,
    isEis: false,
    isDeprecated: false,
    isConnectorTypeDeprecated: false,
    isMissingSecrets: false,
  } as AIConnector,
];

describe('useGenAIConnectors', () => {
  beforeEach(() => {
    mockUseKibana.mockReturnValue({
      services: {
        http: {},
        settings: {},
        notifications: { toasts: {} },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return connectors and set hasConnectors to true when connectors exist', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: mockAIConnectors,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useGenAIConnectors());

    expect(result.current.loading).toBe(false);
    expect(result.current.hasConnectors).toBe(true);
    expect(result.current.connectors).toHaveLength(2);
    expect(result.current.connectors[0].connectorId).toBe('connector-1');
    expect(result.current.connectors[1].connectorId).toBe('connector-2');
  });

  it('should set hasConnectors to false when no connectors exist', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useGenAIConnectors());

    expect(result.current.connectors).toEqual([]);
    expect(result.current.hasConnectors).toBe(false);
  });

  it('should return loading state', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useGenAIConnectors());

    expect(result.current.loading).toBe(true);
    expect(result.current.connectors).toEqual([]);
    expect(result.current.hasConnectors).toBe(false);
  });

  it('should pass featureId to useLoadConnectors', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    renderHook(() => useGenAIConnectors());

    expect(mockUseLoadConnectors).toHaveBeenCalledWith(
      expect.objectContaining({
        featureId: 'observability_ai_insights_inference_subfeature',
      })
    );
  });
});
