/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { OpenAiProviderType } from '@kbn/connector-schemas/openai';
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
  const mockGlobalDefault = (id?: string) =>
    mockUseKibana.mockReturnValue({
      services: {
        http: mockHttp,
        notifications: { toasts: mockToasts },
        settings: { client: { get: jest.fn().mockReturnValue(id) } },
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();

    mockGlobalDefault();

    mockUseLoadConnectors.mockReturnValue({
      data: [
        { id: 'connector-1', name: 'Connector 1' },
        { id: 'connector-2', name: 'Connector 2' },
      ],
      isLoading: false,
      soEntryFound: false,
    });
  });

  describe('when the admin saved models for the feature', () => {
    it('should use the first model, in the admin order, even when a later one is flagged as the global default', () => {
      mockUseLoadConnectors.mockReturnValue({
        data: [
          { id: 'bedrock-connector', name: 'Bedrock', actionTypeId: '.bedrock' },
          {
            id: 'openai-connector',
            name: 'OpenAI',
            actionTypeId: '.gen-ai',
            apiProvider: OpenAiProviderType.OpenAi,
            isDefault: true,
          },
        ],
        isLoading: false,
        soEntryFound: true,
      });
      mockGlobalDefault('openai-connector');

      const { result } = renderHook(() => useDefaultAIConnectorId());

      expect(result.current.defaultConnectorId).toBe('bedrock-connector');
    });

    it('should skip a model that is missing secrets', () => {
      mockUseLoadConnectors.mockReturnValue({
        data: [
          { id: 'connector-1', name: 'Connector 1', isMissingSecrets: true },
          { id: 'connector-2', name: 'Connector 2' },
        ],
        isLoading: false,
        soEntryFound: true,
      });

      const { result } = renderHook(() => useDefaultAIConnectorId());

      expect(result.current.defaultConnectorId).toBe('connector-2');
    });

    it('should return undefined when the saved list is empty', () => {
      mockUseLoadConnectors.mockReturnValue({ data: [], isLoading: false, soEntryFound: true });

      const { result } = renderHook(() => useDefaultAIConnectorId());

      expect(result.current.defaultConnectorId).toBeUndefined();
    });
  });

  describe('when the admin did not save models for the feature', () => {
    it('should return the inference endpoint the server flagged as the default, whichever its position', () => {
      mockGlobalDefault('.custom-stack-connector');
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
        soEntryFound: false,
      });

      const { result } = renderHook(() => useDefaultAIConnectorId());

      expect(result.current.defaultConnectorId).toBe('custom-inference-endpoint');
    });

    it('should return the configured inference endpoint instead of the Elastic-managed connector', () => {
      mockGlobalDefault('custom-inference-endpoint');
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
        soEntryFound: false,
      });

      const { result } = renderHook(() => useDefaultAIConnectorId());

      expect(result.current.defaultConnectorId).toBe('custom-inference-endpoint');
    });

    it('should keep the fallback priority when the server did not select a model, so OpenAI is preferred over an earlier provider', () => {
      mockUseLoadConnectors.mockReturnValue({
        data: [
          { id: 'bedrock-connector', name: 'Bedrock', actionTypeId: '.bedrock' },
          {
            id: 'openai-connector',
            name: 'OpenAI',
            actionTypeId: '.gen-ai',
            apiProvider: OpenAiProviderType.OpenAi,
          },
        ],
        isLoading: false,
        soEntryFound: false,
      });

      const { result } = renderHook(() => useDefaultAIConnectorId());

      expect(result.current.defaultConnectorId).toBe('openai-connector');
    });

    it('should return undefined when there are no connectors', () => {
      mockUseLoadConnectors.mockReturnValue({ data: [], isLoading: false, soEntryFound: false });

      const { result } = renderHook(() => useDefaultAIConnectorId());

      expect(result.current.defaultConnectorId).toBeUndefined();
    });
  });

  it('should return undefined when the connectors are not loaded yet', () => {
    mockUseLoadConnectors.mockReturnValue({
      data: undefined,
      isLoading: true,
      soEntryFound: false,
    });

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
    mockUseLoadConnectors.mockReturnValue({ data: [], isLoading: true, soEntryFound: false });

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.isLoading).toBe(true);
  });

  it('should return isLoading false when connectors are not loading', () => {
    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.isLoading).toBe(false);
  });
});
