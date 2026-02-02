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

jest.mock('../lib/kibana');
jest.mock('./use_ai_connectors');
jest.mock('@kbn/elastic-assistant/impl/assistant/helpers');

const mockUseKibana = useKibana as jest.Mock;
const mockUseAIConnectors = useAIConnectors as jest.Mock;
const mockGetDefaultConnector = getDefaultConnector as jest.Mock;

describe('useDefaultAIConnectorId', () => {
  const mockSettings = {};
  const mockConnectors = [
    { id: 'connector-1', name: 'Connector 1' },
    { id: 'connector-2', name: 'Connector 2' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        settings: mockSettings,
      },
    });

    mockUseAIConnectors.mockReturnValue({
      aiConnectors: mockConnectors,
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
