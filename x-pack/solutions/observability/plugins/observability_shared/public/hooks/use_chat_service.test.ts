/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useChatService } from './use_chat_service';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useAbortableAsync } from '@kbn/react-hooks';
import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('@kbn/react-hooks', () => ({
  useAbortableAsync: jest.fn(),
}));

describe('useChatService', () => {
  const mockObservabilityAIAssistant = observabilityAIAssistantPluginMock.createStartContract();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        observabilityAIAssistant: mockObservabilityAIAssistant,
      },
    });
    (useAbortableAsync as jest.Mock).mockImplementation((fn) => fn({ signal: {} }));
  });

  it('should return the correct values when ObservabilityAIAssistant is enabled', () => {
    mockObservabilityAIAssistant.useGenAIConnectors = jest.fn().mockReturnValue({
      connectors: [{ id: 'test-connector' }, { id: 'another-connector' }],
      selectedConnector: { id: 'test-connector' },
    });
    const { result } = renderHook(() =>
      useChatService({
        observabilityAIAssistant: mockObservabilityAIAssistant,
      })
    );

    expect(result.current.ObservabilityAIAssistantChatServiceContext).toBe(
      mockObservabilityAIAssistant.ObservabilityAIAssistantChatServiceContext
    );
    expect(result.current.isObsAIAssistantEnabled).toBe(true);
    expect(result.current.connectors).toEqual([
      { id: 'test-connector' },
      { id: 'another-connector' },
    ]);
    expect(result.current.selectedConnector).toEqual({ id: 'test-connector' });
  });

  it('should start the chat service when ObservabilityAIAssistant is enabled', () => {
    const mockStart = jest.fn().mockResolvedValue({ complete: jest.fn() });
    mockObservabilityAIAssistant.service.start = mockStart;
    const { result } = renderHook(() =>
      useChatService({
        observabilityAIAssistant: mockObservabilityAIAssistant,
      })
    );
    expect(result.current.chatService).toBeDefined();
    expect(mockStart).toHaveBeenCalled();
  });

  it('should return isObsAIAssistantEnabled as false when ObservabilityAIAssistant is not available', () => {
    const { result } = renderHook(() =>
      useChatService({
        observabilityAIAssistant: undefined,
      })
    );

    expect(result.current.ObservabilityAIAssistantChatServiceContext).toBeUndefined();
    expect(result.current.isObsAIAssistantEnabled).toBe(false);
    expect(result.current.connectors).toEqual([]);
  });

  it('should track errors when the chat service fails to start', async () => {
    const mockError = new Error('Test error');
    jest.spyOn(mockObservabilityAIAssistant.service, 'start').mockRejectedValueOnce(mockError);

    const { result } = renderHook(() =>
      useChatService({
        observabilityAIAssistant: mockObservabilityAIAssistant,
      })
    );

    await waitFor(() => {
      expect(result.current.errors).toContain(mockError);
    });
  });

  it('returns isObsAIAssistantEnabled as false when observability ai assistant is not available', () => {
    const { result } = renderHook(() =>
      useChatService({
        observabilityAIAssistant: undefined,
      })
    );

    expect(result.current).toEqual({
      ObservabilityAIAssistantChatServiceContext: undefined,
      chatService: null,
      observabilityAIAssistantService: undefined,
      isObsAIAssistantEnabled: false,
      connectors: [],
      selectedConnector: undefined,
      errors: [],
    });
  });

  it('returns isObsAIAssistantEnabled as false when context is not available', () => {
    const { result } = renderHook(() =>
      useChatService({
        observabilityAIAssistant: {
          ...mockObservabilityAIAssistant,
          // @ts-ignore
          ObservabilityAIAssistantChatServiceContext: undefined,
        },
      })
    );

    expect(result.current.isObsAIAssistantEnabled).toBe(false);
  });

  it('returns isObsAIAssistantEnabled as false when service is not enabled', () => {
    const mockService = {
      isEnabled: jest.fn().mockReturnValue(false),
    };
    const { result } = renderHook(() =>
      useChatService({
        observabilityAIAssistant: {
          ...mockObservabilityAIAssistant,
          service: mockService as any,
        },
      })
    );

    expect(result.current.isObsAIAssistantEnabled).toBe(false);
  });
});
