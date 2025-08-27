/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { usePageSummary } from './use_page_summary';
import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import type {
  MessageRole,
  StreamingChatResponseEventWithoutError,
} from '@kbn/observability-ai-assistant-plugin/common';
import { type ObservabilityAIAssistantChatService } from '@kbn/observability-ai-assistant-plugin/public';
import * as useChatServiceHook from './use_chat_service';
import { Observable, of, BehaviorSubject } from 'rxjs';

jest.mock('./use_chat_service', () => ({
  useChatService: jest.fn(() => ({
    ObservabilityAIAssistantChatServiceContext: null,
    chatService: {
      complete: jest.fn(),
    },
    observabilityAIAssistantService: null,
    isObsAIAssistantEnabled: true,
    connectors: [],
    selectedConnector: null,
    errors: [],
  })),
}));

describe('usePageSummary', () => {
  const mockObservabilityAIAssistant = observabilityAIAssistantPluginMock.createStartContract();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default states', () => {
    const { result } = renderHook(() =>
      usePageSummary({ observabilityAIAssistant: mockObservabilityAIAssistant })
    );
    expect(result.current.summary).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.errors).toEqual([]);
  });

  it('should handle loading state correctly', () => {
    const mockOnSuccess = jest.fn();
    const { result } = renderHook(() =>
      usePageSummary({
        onSuccess: mockOnSuccess,
        observabilityAIAssistant: mockObservabilityAIAssistant,
      })
    );

    result.current.generateSummary();

    expect(result.current.isLoading).toBe(true);
  });

  it('should handle errors correctly', () => {
    const mockOnSuccess = jest.fn();
    const { result } = renderHook(() =>
      usePageSummary({
        onSuccess: mockOnSuccess,
        observabilityAIAssistant: mockObservabilityAIAssistant,
      })
    );

    result.current.generateSummary();

    result.current.errors.push(new Error('Test error'));

    expect(result.current.errors.length).toBe(1);
    expect(result.current.errors[0].message).toBe('Test error');
  });

  it('sets isLoading to false when observabilityAIAssistant is not enabled', () => {
    jest.spyOn(useChatServiceHook, 'useChatService').mockReturnValue({
      ObservabilityAIAssistantChatServiceContext: undefined,
      chatService: null,
      observabilityAIAssistantService: undefined,
      isObsAIAssistantEnabled: false,
      connectors: [],
      selectedConnector: undefined,
      errors: [],
    });
    const { result } = renderHook(() =>
      usePageSummary({
        observabilityAIAssistant: mockObservabilityAIAssistant,
      })
    );

    act(() => {
      result.current.generateSummary();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.summary).toBe(null);
  });

  it('should call onChunk when chunk event comes in', () => {
    const observable = of({
      type: 'chatCompletionChunk',
      '@timestamp': new Date().toISOString(),
      message: {
        content: 'Generated chunk',
        role: 'assistant' as MessageRole,
      },
      id: '2',
    } as StreamingChatResponseEventWithoutError);
    jest.spyOn(useChatServiceHook, 'useChatService').mockReturnValue({
      ObservabilityAIAssistantChatServiceContext: undefined,
      chatService: {
        complete: jest.fn(() => observable),
        sendAnalyticsEvent: jest.fn(),
        chat: jest.fn(),
        getFunctions: jest.fn(),
        hasFunction: jest.fn(),
        hasRenderFunction: jest.fn(),
        getSystemMessage: jest.fn(),
        getScopes: jest.fn(),
        renderFunction: jest.fn(),
        functions$: new BehaviorSubject(
          []
        ) as unknown as ObservabilityAIAssistantChatService['functions$'],
      },
      observabilityAIAssistantService: mockObservabilityAIAssistant.service,
      isObsAIAssistantEnabled: true,
      connectors: [],
      selectedConnector: 'test-connector',
      errors: [],
    });
    const mockOnChunk = jest.fn();
    const { result } = renderHook(() =>
      usePageSummary({
        onChunk: mockOnChunk,
        observabilityAIAssistant: mockObservabilityAIAssistant,
      })
    );

    act(() => {
      result.current.generateSummary();
    });

    expect(mockOnChunk).toHaveBeenCalledWith('Generated chunk');
  });

  it('should call onSuccess when summary event comes in', () => {
    const observable = of({
      type: 'chatCompletionMessage',
      '@timestamp': new Date().toISOString(),
      message: {
        content: 'Generated summary',
        role: 'assistant' as MessageRole,
      },
      id: '1',
    } as StreamingChatResponseEventWithoutError);
    jest.spyOn(useChatServiceHook, 'useChatService').mockReturnValue({
      ObservabilityAIAssistantChatServiceContext: undefined,
      chatService: {
        complete: jest.fn(() => observable) as ObservabilityAIAssistantChatService['complete'],
      } as ObservabilityAIAssistantChatService,
      observabilityAIAssistantService: mockObservabilityAIAssistant.service,
      isObsAIAssistantEnabled: true,
      connectors: [],
      selectedConnector: 'test-connector',
      errors: [],
    });
    const mockOnSuccess = jest.fn();
    const { result } = renderHook(() =>
      usePageSummary({
        onSuccess: mockOnSuccess,
        observabilityAIAssistant: mockObservabilityAIAssistant,
      })
    );

    act(() => {
      result.current.generateSummary();
    });

    expect(mockOnSuccess).toHaveBeenCalledWith('Generated summary');
  });

  it('should handle errors from the observable correctly', () => {
    const observable = new Observable((subscriber) => {
      subscriber.error(new Error('Observable error'));
    });
    jest.spyOn(useChatServiceHook, 'useChatService').mockReturnValue({
      ObservabilityAIAssistantChatServiceContext: undefined,
      chatService: {
        complete: jest.fn(() => observable) as ObservabilityAIAssistantChatService['complete'],
      } as ObservabilityAIAssistantChatService,
      observabilityAIAssistantService: mockObservabilityAIAssistant.service,
      isObsAIAssistantEnabled: true,
      connectors: [],
      selectedConnector: 'test-connector',
      errors: [],
    });
    const { result } = renderHook(() =>
      usePageSummary({
        observabilityAIAssistant: mockObservabilityAIAssistant,
      })
    );

    act(() => {
      result.current.generateSummary();
    });

    expect(result.current.errors).toEqual([new Error('Observable error')]);
    expect(result.current.isLoading).toBe(false);
  });
});
