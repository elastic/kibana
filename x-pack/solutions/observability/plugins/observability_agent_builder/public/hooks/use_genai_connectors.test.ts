/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import { useGenAIConnectors } from './use_genai_connectors';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const mockGetConnectors = jest.fn();

const mockConnectors: InferenceConnector[] = [
  {
    connectorId: 'connector-1',
    name: 'OpenAI Connector',
    type: InferenceConnectorType.OpenAI,
    config: {},
    capabilities: {},
  },
  {
    connectorId: 'connector-2',
    name: 'Bedrock Connector',
    type: InferenceConnectorType.Bedrock,
    config: {},
    capabilities: {},
  },
];

describe('useGenAIConnectors', () => {
  beforeEach(() => {
    mockGetConnectors.mockReset();
    mockUseKibana.mockReturnValue({
      services: {
        inference: {
          getConnectors: mockGetConnectors,
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch connectors and set hasConnectors to true when connectors exist', async () => {
    mockGetConnectors.mockResolvedValue(mockConnectors);
    const { result, unmount } = renderHook(() => useGenAIConnectors());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.connectors).toEqual(mockConnectors);
    expect(result.current.hasConnectors).toBe(true);

    unmount();
  });

  it('should set hasConnectors to false when no connectors exist', async () => {
    mockGetConnectors.mockResolvedValue([]);
    const { result, unmount } = renderHook(() => useGenAIConnectors());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.connectors).toEqual([]);
    expect(result.current.hasConnectors).toBe(false);

    unmount();
  });

  it('should handle API errors', async () => {
    mockGetConnectors.mockRejectedValue(new Error('API failed'));
    const { result, unmount } = renderHook(() => useGenAIConnectors());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.connectors).toEqual([]);
    expect(result.current.hasConnectors).toBe(false);

    unmount();
  });
});
