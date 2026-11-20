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

jest.mock('../lib/kibana');
jest.mock('@kbn/inference-connectors');

const mockUseKibana = useKibana as jest.Mock;
const mockUseLoadConnectors = useLoadConnectors as jest.Mock;

describe('useDefaultAIConnectorId', () => {
  const mockHttp = {};
  const mockToasts = {};

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        http: mockHttp,
        notifications: { toasts: mockToasts },
      },
    });

    mockUseLoadConnectors.mockReturnValue({
      data: [
        { id: 'connector-1', name: 'Connector 1' },
        { id: 'connector-2', name: 'Connector 2' },
      ],
      isLoading: false,
    });
  });

  it('should return the id of the first connector of the list', () => {
    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.defaultConnectorId).toBe('connector-1');
  });

  it('should keep the order of the list, so the first model of a saved override is used', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: [
        { id: 'bedrock-connector', name: 'Bedrock', actionTypeId: '.bedrock' },
        { id: 'openai-connector', name: 'OpenAI', actionTypeId: '.gen-ai' },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.defaultConnectorId).toBe('bedrock-connector');
  });

  it('should return the inference endpoint the server put first, which is the global default', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: [
        {
          id: 'custom-inference-endpoint',
          name: 'custom-inference-endpoint',
          isInferenceEndpoint: true,
          isDefault: true,
        },
        { id: 'Anthropic-Claude-Sonnet-3-7', name: 'Anthropic Claude Sonnet 3.7' },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.defaultConnectorId).toBe('custom-inference-endpoint');
  });

  it('should skip a connector that is missing secrets', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: [
        { id: 'connector-1', name: 'Connector 1', isMissingSecrets: true },
        { id: 'connector-2', name: 'Connector 2' },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.defaultConnectorId).toBe('connector-2');
  });

  it('should return undefined when there are no connectors', () => {
    mockUseLoadConnectors.mockReturnValue({ data: [], isLoading: false });

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.defaultConnectorId).toBeUndefined();
  });

  it('should return undefined when the connectors are not loaded yet', () => {
    mockUseLoadConnectors.mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.defaultConnectorId).toBeUndefined();
  });

  it('should load the connectors from the alert_ai_summary inference feature, reporting load errors through toasts, so that inference endpoints are included', () => {
    renderHook(() => useDefaultAIConnectorId());

    expect(mockUseLoadConnectors).toHaveBeenCalledWith({
      http: mockHttp,
      toasts: mockToasts,
      featureId: 'alert_ai_summary',
    });
  });

  it('should return isLoading true when connectors are loading', () => {
    mockUseLoadConnectors.mockReturnValue({ data: [], isLoading: true });

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.isLoading).toBe(true);
  });

  it('should return isLoading false when connectors are not loading', () => {
    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.isLoading).toBe(false);
  });
});
