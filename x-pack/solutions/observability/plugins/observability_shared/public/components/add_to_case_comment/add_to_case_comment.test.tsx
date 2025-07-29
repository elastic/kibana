/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddToCaseComment } from '.';
import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import * as usePageSummaryHook from '../../hooks/use_page_summary';

// Mock i18n
jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => (
    <span>{defaultMessage}</span>
  ),
  useIntl: () => ({
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
  }),
}));

const mockObservabilityAIAssistant = observabilityAIAssistantPluginMock.createStartContract();

describe('AddToCaseComment', () => {
  const setSummaryMock = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: true,
      generateSummary: jest.fn(),
      isLoading: false,
      summary: '',
      setSummary: setSummaryMock,
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
    });
  });
  it('renders the input field with placeholder text', () => {
    render(
      <AddToCaseComment
        comment=""
        onCommentChange={jest.fn()}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={undefined}
      />
    );

    expect(screen.getByPlaceholderText('Add a comment (optional)')).toBeInTheDocument();
  });

  it('updates the comment when text is entered', () => {
    const onCommentChangeMock = jest.fn();
    render(
      <AddToCaseComment
        comment=""
        onCommentChange={onCommentChangeMock}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={undefined}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Add a comment (optional)'), {
      target: { value: 'New comment' },
    });

    expect(onCommentChangeMock).toHaveBeenCalledWith('New comment');
  });

  it('shows skeleton loader when AI assistant is enabled and loading', () => {
    jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: true,
      generateSummary: jest.fn(),
      isLoading: true,
      summary: '',
      setSummary: setSummaryMock,
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
    });

    render(
      <AddToCaseComment
        comment=""
        onCommentChange={jest.fn()}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={mockObservabilityAIAssistant}
      />
    );

    expect(screen.getByTestId('addPageToCaseCommentSkeleton')).toBeInTheDocument();
  });

  it('displays AI assistant help text when enabled', () => {
    render(
      <AddToCaseComment
        comment=""
        onCommentChange={jest.fn()}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={mockObservabilityAIAssistant}
      />
    );

    expect(
      screen.getByText(
        '{icon} Initial comment AI generated. AI can be wrong or incomplete. Please review and edit as necessary.'
      )
    ).toBeInTheDocument();
  });

  it('does not display AI assistant help text when isObsAIAssistantEnabled is false', () => {
    jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: false,
      generateSummary: jest.fn(),
      isLoading: false,
      summary: '',
      setSummary: setSummaryMock,
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
    });

    render(
      <AddToCaseComment
        comment=""
        onCommentChange={jest.fn()}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={undefined}
      />
    );

    expect(
      screen.queryByText(
        '{icon} Initial comment AI generated. AI can be wrong or incomplete. Please review and edit as necessary.'
      )
    ).not.toBeInTheDocument();
  });

  it('calls generateSummary when isObsAIAssistantEnabled is true', () => {
    const generateSummaryMock = jest.fn();
    jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: true,
      generateSummary: generateSummaryMock,
      isLoading: false,
      summary: '',
      setSummary: jest.fn(),
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
    });

    render(
      <AddToCaseComment
        comment=""
        onCommentChange={jest.fn()}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={mockObservabilityAIAssistant}
      />
    );

    expect(generateSummaryMock).toHaveBeenCalled();
  });

  it('appends partial summaries to the comment using handleStreamingUpdate', () => {
    const onCommentChangeMock = jest.fn((prevComment) => `${prevComment} Partial summary`);
    const generateSummaryMock = jest.fn();
    const usePageSummarySpy = jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: true,
      generateSummary: generateSummaryMock,
      isLoading: false,
      summary: '',
      setSummary: jest.fn(),
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
    });

    render(
      <AddToCaseComment
        comment="Existing comment"
        onCommentChange={onCommentChangeMock}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={mockObservabilityAIAssistant}
      />
    );

    expect(onCommentChangeMock).not.toBeCalledWith(expect.any(Function));

    expect(screen.getByText('Existing comment')).toBeInTheDocument();

    expect(generateSummaryMock).toHaveBeenCalled();

    const handleStreamingUpdate = usePageSummarySpy.mock.calls[0]![0]!.onChunk!;
    handleStreamingUpdate(' Partial summary');

    expect(onCommentChangeMock).toBeCalledWith(expect.any(Function));
  });
});
