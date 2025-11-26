/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { AnonymizationFieldResponse, Replacements } from '@kbn/elastic-assistant-common';
import { useFetchEntityDetailsHighlights } from './use_fetch_entity_details_highlights';
import { useChatComplete } from '@kbn/elastic-assistant';

const mockFetchEntityDetailsHighlights = jest.fn();
const mockAddError = jest.fn();
const mockSendMessage = jest.fn();
const mockAbortStream = jest.fn();

const mockUseChatComplete = useChatComplete as jest.MockedFunction<typeof useChatComplete>;

jest.mock('../../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    fetchEntityDetailsHighlights: mockFetchEntityDetailsHighlights,
  }),
}));

jest.mock('../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addError: mockAddError,
  }),
}));

jest.mock('../../../../common/containers/use_global_time', () => ({
  useGlobalTime: () => ({
    from: '2023-01-01T00:00:00.000Z',
    to: '2023-01-02T00:00:00.000Z',
  }),
}));

jest.mock('@kbn/elastic-assistant', () => ({
  useChatComplete: jest.fn(),
}));

const mockProps = {
  connectorId: 'test-connector-id',
  anonymizationFields: [
    {
      id: 'field1',
      field: 'test.field',
      allowed: true,
      anonymized: false,
    },
  ] as AnonymizationFieldResponse[],
  entityType: 'user',
  entityIdentifier: 'test-user',
};

const mockEntityDetailsResponse = {
  summary: { entitySummary: 'Test summary data' },
  replacements: { 'anonymized-user': 'test-user' } as Replacements,
  prompt: 'Test prompt for AI',
};

const mockSuccessfulSendMessageResponse = {
  isError: false,
  response: 'AI generated analysis of the entity',
};

const mockErrorSendMessageResponse = {
  isError: true,
  response: 'Error processing request',
};

describe('useFetchEntityDetailsHighlights', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseChatComplete.mockReturnValue({
      sendMessage: mockSendMessage,
      abortStream: mockAbortStream,
      isLoading: false,
    });
  });

  it('returns the expected initial state and functions', () => {
    const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

    expect(result.current).toEqual({
      fetchEntityHighlights: expect.any(Function),
      isChatLoading: false,
      abortStream: mockAbortStream,
      result: null,
    });
  });

  it('successfully fetches entity highlights and sends message to AI', async () => {
    mockFetchEntityDetailsHighlights.mockResolvedValueOnce(mockEntityDetailsResponse);
    mockSendMessage.mockResolvedValueOnce(mockSuccessfulSendMessageResponse);

    const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

    await act(async () => {
      await result.current.fetchEntityHighlights();
    });

    expect(mockFetchEntityDetailsHighlights).toHaveBeenCalledWith({
      entityType: 'user',
      entityIdentifier: 'test-user',
      anonymizationFields: mockProps.anonymizationFields,
      from: new Date('2023-01-01T00:00:00.000Z').getTime(),
      to: new Date('2023-01-02T00:00:00.000Z').getTime(),
      connectorId: 'test-connector-id',
    });

    expect(mockSendMessage).toHaveBeenCalledWith({
      message: expect.stringContaining('Test prompt for AI'),
      replacements: mockEntityDetailsResponse.replacements,
      query: {
        content_references_disabled: true,
      },
    });

    // Verify the result state is updated
    expect(result.current.result).toEqual({
      formattedEntitySummary: JSON.stringify(mockEntityDetailsResponse.summary),
      aiResponse: 'AI generated analysis of the entity',
      replacements: mockEntityDetailsResponse.replacements,
    });

    // Verify no errors were added
    expect(mockAddError).not.toHaveBeenCalled();
  });

  it('handles error from fetchEntityDetailsHighlights API', async () => {
    const apiError = new Error('API Error');
    mockFetchEntityDetailsHighlights.mockRejectedValueOnce(apiError);

    const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

    await act(async () => {
      await result.current.fetchEntityHighlights();
    });

    expect(mockAddError).toHaveBeenCalledWith(apiError, {
      title: 'Failed to run LLM',
    });

    // Verify sendMessage was not called due to early return
    expect(mockSendMessage).not.toHaveBeenCalled();

    expect(result.current.result).toBeNull();
  });

  it('handles error from sendMessage', async () => {
    mockFetchEntityDetailsHighlights.mockResolvedValueOnce(mockEntityDetailsResponse);
    mockSendMessage.mockResolvedValueOnce(mockErrorSendMessageResponse);

    const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

    await act(async () => {
      await result.current.fetchEntityHighlights();
    });

    expect(mockFetchEntityDetailsHighlights).toHaveBeenCalled();

    expect(mockSendMessage).toHaveBeenCalled();

    expect(mockAddError).toHaveBeenCalledWith(new Error('Error processing request'), {
      title: 'Failed to run LLM',
    });

    expect(result.current.result).toBeNull();
  });

  it('returns early when fetchEntityDetailsHighlights returns null summary', async () => {
    mockFetchEntityDetailsHighlights.mockResolvedValueOnce({
      summary: null,
      replacements: mockEntityDetailsResponse.replacements,
      prompt: mockEntityDetailsResponse.prompt,
    });

    const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

    await act(async () => {
      await result.current.fetchEntityHighlights();
    });

    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
  });

  it('returns early when fetchEntityDetailsHighlights returns null replacements', async () => {
    mockFetchEntityDetailsHighlights.mockResolvedValueOnce({
      summary: mockEntityDetailsResponse.summary,
      replacements: null,
      prompt: mockEntityDetailsResponse.prompt,
    });

    const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

    await act(async () => {
      await result.current.fetchEntityHighlights();
    });

    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
  });

  it('returns early when fetchEntityDetailsHighlights returns null prompt', async () => {
    mockFetchEntityDetailsHighlights.mockResolvedValueOnce({
      summary: mockEntityDetailsResponse.summary,
      replacements: mockEntityDetailsResponse.replacements,
      prompt: null,
    });

    const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

    await act(async () => {
      await result.current.fetchEntityHighlights();
    });

    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
  });

  it('formats the message correctly with entity context', async () => {
    mockFetchEntityDetailsHighlights.mockResolvedValueOnce(mockEntityDetailsResponse);
    mockSendMessage.mockResolvedValueOnce(mockSuccessfulSendMessageResponse);

    const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

    await act(async () => {
      await result.current.fetchEntityHighlights();
    });

    const expectedMessage = `Test prompt for AI.      
        Context:
            EntityType: user,
            EntityIdentifier: anonymized-user,
          ${JSON.stringify(mockEntityDetailsResponse.summary)}
        `;

    expect(mockSendMessage).toHaveBeenCalledWith({
      message: expectedMessage,
      replacements: mockEntityDetailsResponse.replacements,
      query: {
        content_references_disabled: true,
      },
    });
  });
});
