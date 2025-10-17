/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useDefaultAIConnectorId } from './use_default_ai_connector_id';
import { useKibana } from '../lib/kibana';
import { useAIConnectors } from './use_ai_connectors';
import { getDefaultConnector } from '@kbn/elastic-assistant/impl/assistant/helpers';
import {
  AI_ASSISTANT_DEFAULT_LLM_SETTING_ENABLED,
  AI_ASSISTANT_DEFAULT_LLM_SETTING_ENABLED_VALUE,
  DEFAULT_AI_CONNECTOR,
} from '../../../common/constants';

jest.mock('../lib/kibana');
jest.mock('./use_ai_connectors');
jest.mock('@kbn/elastic-assistant/impl/assistant/helpers');

const mockUseKibana = useKibana as jest.Mock;
const mockUseAIConnectors = useAIConnectors as jest.Mock;
const mockGetDefaultConnector = getDefaultConnector as jest.Mock;

describe('useDefaultAIConnectorId', () => {
  const mockSettings = {};
  const mockUiSettings = {
    get: jest.fn(),
  };
  const mockFeatureFlags = {
    getBooleanValue: jest.fn(),
  };
  const mockConnectors = [
    { id: 'connector-1', name: 'Connector 1' },
    { id: 'connector-2', name: 'Connector 2' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        settings: mockSettings,
        uiSettings: mockUiSettings,
        featureFlags: mockFeatureFlags,
      },
    });

    mockUseAIConnectors.mockReturnValue({
      aiConnectors: mockConnectors,
      isLoading: false,
    });

    mockUiSettings.get.mockReturnValue('legacy-connector-id');
    mockFeatureFlags.getBooleanValue.mockReturnValue(false);
    mockGetDefaultConnector.mockReturnValue({ id: 'new-connector-id' });
  });

  it('should return legacy connector id when new default connector feature is disabled', () => {
    mockFeatureFlags.getBooleanValue.mockReturnValue(false);

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.defaultConnectorId).toBe('legacy-connector-id');
  });

  it('should return new connector id when new default connector feature is enabled', () => {
    mockFeatureFlags.getBooleanValue.mockReturnValue(true);

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.defaultConnectorId).toBe('new-connector-id');
  });

  it('should return undefined when new default connector feature is enabled but getDefaultConnector returns undefined', () => {
    mockFeatureFlags.getBooleanValue.mockReturnValue(true);
    mockGetDefaultConnector.mockReturnValue(undefined);

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.defaultConnectorId).toBeUndefined();
  });

  it('should return undefined when new default connector feature is enabled but getDefaultConnector returns null', () => {
    mockFeatureFlags.getBooleanValue.mockReturnValue(true);
    mockGetDefaultConnector.mockReturnValue(null);

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.defaultConnectorId).toBeUndefined();
  });

  it('should call getBooleanValue with correct parameters', () => {
    renderHook(() => useDefaultAIConnectorId());

    expect(mockFeatureFlags.getBooleanValue).toHaveBeenCalledWith(
      AI_ASSISTANT_DEFAULT_LLM_SETTING_ENABLED,
      AI_ASSISTANT_DEFAULT_LLM_SETTING_ENABLED_VALUE
    );
  });

  it('should call uiSettings.get with correct parameter', () => {
    renderHook(() => useDefaultAIConnectorId());

    expect(mockUiSettings.get).toHaveBeenCalledWith(DEFAULT_AI_CONNECTOR);
  });

  it('should call getDefaultConnector with correct parameters', () => {
    renderHook(() => useDefaultAIConnectorId());

    expect(mockGetDefaultConnector).toHaveBeenCalledWith(mockConnectors, mockSettings);
  });

  it('should return undefined when legacy connector id is undefined and new feature is disabled', () => {
    mockUiSettings.get.mockReturnValue(undefined);
    mockFeatureFlags.getBooleanValue.mockReturnValue(false);

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.defaultConnectorId).toBeUndefined();
  });

  it('should return isLoading true when connectors are loading', () => {
    mockUseAIConnectors.mockReturnValue({
      aiConnectors: mockConnectors,
      isLoading: true,
    });

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.isLoading).toBe(true);
  });

  it('should return isLoading false when connectors are not loading', () => {
    mockUseAIConnectors.mockReturnValue({
      aiConnectors: mockConnectors,
      isLoading: false,
    });

    const { result } = renderHook(() => useDefaultAIConnectorId());

    expect(result.current.isLoading).toBe(false);
  });
});
