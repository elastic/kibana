/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { usePageSummary } from './use_page_summary';
import { useChatService } from './use_chat_service';

jest.mock('./use_chat_service', () => ({
  useChatService: jest.fn(),
}));

jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: (id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
  },
}));

const mockChatService = {
  value: {
    complete: jest.fn(),
  },
};

const mockObservabilityService = {
  getScreenContexts: jest.fn(),
};

describe('usePageSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useChatService as jest.Mock).mockReturnValue({
      chatService: mockChatService,
      observabilityAIAssistantService: mockObservabilityService,
      connectors: [{ id: 'test-connector' }],
      isObsAIAssistantEnabled: true,
    });
  });

  it('should call onChunk for streaming updates', async () => {
    const onChunk = jest.fn();
    const { result } = renderHook(() => usePageSummary({ onChunk }));

    const mockSubscribe = {
      subscribe: ({ next }: any) => {
        next({ type: 'chatCompletionChunk', message: { content: 'chunk1' } });
        next({ type: 'chatCompletionChunk', message: { content: 'chunk2' } });
      },
    };

    mockChatService.value.complete.mockReturnValue(mockSubscribe);

    result.current.generateSummary();

    await waitFor(() => {
      expect(onChunk).toHaveBeenCalledWith('chunk1');
      expect(onChunk).toHaveBeenCalledWith('chunk2');
    });
  });

  it('should call onSuccess when the summary is complete', async () => {
    const onSuccess = jest.fn();
    const { result } = renderHook(() => usePageSummary({ onSuccess }));

    let nextFn: any; // Variable to store the `next` function
    const mockSubscribe = {
      subscribe: ({ next }: any) => {
        nextFn = next; // Store the `next` function
        next({ type: 'chatCompletionChunk', message: { content: 'final summary' } });
      },
    };

    mockChatService.value.complete.mockReturnValue(mockSubscribe);

    result.current.generateSummary();

    // Call `next` explicitly here
    nextFn({ type: 'chatCompletionMessage', message: { content: 'final summary' } });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('final summary');
    });
  });

  it('should handle loading state correctly', async () => {
    const { result } = renderHook(() => usePageSummary());

    let nextFn: any; // Variable to store the `next` function
    const mockSubscribe = {
      subscribe: ({ next }: any) => {
        nextFn = next; // Store the `next` function
        next({ type: 'chatCompletionChunk', message: { content: 'chunk' } });
      },
    };

    mockChatService.value.complete.mockReturnValue(mockSubscribe);

    result.current.generateSummary();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // Call `next` explicitly here
    nextFn({ type: 'chatCompletionChunk', message: { content: '' } });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should not call chat service when obsAIAssistantEnabled is false', async () => {
    (useChatService as jest.Mock).mockReturnValue({
      chatService: mockChatService,
      observabilityAIAssistantService: mockObservabilityService,
      connectors: [{ id: 'test-connector' }],
      isObsAIAssistantEnabled: false,
    });

    const { result } = renderHook(() => usePageSummary());

    result.current.generateSummary();

    expect(mockChatService.value.complete).not.toHaveBeenCalled();
  });

  it('should not call chat service when connectors are empty', async () => {
    (useChatService as jest.Mock).mockReturnValue({
      chatService: mockChatService,
      observabilityAIAssistantService: mockObservabilityService,
      connectors: [],
      isObsAIAssistantEnabled: true,
    });

    const { result } = renderHook(() => usePageSummary());

    result.current.generateSummary();

    expect(mockChatService.value.complete).not.toHaveBeenCalled();
  });

  it('should not call chat service when observabilityAIAssistantService is not available', async () => {
    (useChatService as jest.Mock).mockReturnValue({
      chatService: mockChatService,
      observabilityAIAssistantService: null,
      connectors: [{ id: 'test-connector' }],
      isObsAIAssistantEnabled: true,
    });

    const { result } = renderHook(() => usePageSummary());

    result.current.generateSummary();

    expect(mockChatService.value.complete).not.toHaveBeenCalled();
  });

  it('should not call chat service when chatService is not available', async () => {
    (useChatService as jest.Mock).mockReturnValue({
      chatService: { value: null },
      observabilityAIAssistantService: mockObservabilityService,
      connectors: [{ id: 'test-connector' }],
      isObsAIAssistantEnabled: true,
    });

    const { result } = renderHook(() => usePageSummary());

    result.current.generateSummary();

    expect(mockChatService.value.complete).not.toHaveBeenCalled();
  });

  it('should call complete correctly', () => {
    const { result } = renderHook(() => usePageSummary());

    result.current.generateSummary();

    expect(mockChatService.value.complete).toHaveBeenCalledWith({
      getScreenContexts: expect.any(Function),
      conversationId: expect.any(String),
      signal: expect.any(AbortSignal),
      connectorId: 'test-connector',
      messages: [
        {
          '@timestamp': expect.any(String),
          message: {
            role: 'user',
            content: expect.any(String),
          },
        },
      ],
      scopes: ['observability'],
      disableFunctions: true,
      persist: false,
      systemMessage: expect.any(String),
    });
  });

  it('should format screen contexts correctly', () => {
    const screenContexts = [
      { screenDescription: 'Test description 1' },
      { screenDescription: 'Test description 2' },
      { screenDescription: '' }, // Should be filtered out
    ];

    mockObservabilityService.getScreenContexts.mockReturnValue(screenContexts);

    const { result } = renderHook(() => usePageSummary());

    expect(result.current.screenContexts).toEqual([
      { screenDescription: 'Test description 1' },
      { screenDescription: 'Test description 2' },
    ]);
  });

  it('should handle empty screen contexts', () => {
    mockObservabilityService.getScreenContexts.mockReturnValue([]);

    const { result } = renderHook(() => usePageSummary());

    expect(result.current.screenContexts).toEqual([]);
  });
});
