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
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
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
  const addErrorMock = jest.fn();
  const notificationsContractMock = notificationServiceMock.createStartContract();
  const notificationsMock = {
    ...notificationsContractMock,
    toasts: {
      ...notificationsContractMock.toasts,
      addError: addErrorMock,
    },
  };
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: true,
      generateSummary: jest.fn(),
      isLoading: false,
      summary: '',
      errors: [],
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
      isComplete: false,
    });
  });

  it('renders the input field with placeholder text', () => {
    render(
      <AddToCaseComment
        comment="test comment"
        setComment={jest.fn()}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={undefined}
        notifications={notificationsMock}
      />
    );

    expect(screen.getByLabelText('Add a comment (optional)')).toBeInTheDocument();
  });

  it('updates the comment when text is entered', () => {
    const onCommentChangeMock = jest.fn();
    render(
      <AddToCaseComment
        comment="test comment"
        setComment={onCommentChangeMock}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={undefined}
        notifications={notificationsMock}
      />
    );

    fireEvent.change(screen.getByLabelText('Add a comment (optional)'), {
      target: { value: 'New comment' },
    });

    expect(onCommentChangeMock).toHaveBeenCalledWith('New comment');
  });

  it('shows input when AI assistant is enabled and comment is defined', () => {
    jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: true,
      generateSummary: jest.fn(),
      isLoading: true,
      summary: '',
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
      errors: [],
      isComplete: false,
    });

    render(
      <AddToCaseComment
        comment="a comment"
        setComment={jest.fn()}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={mockObservabilityAIAssistant}
        notifications={notificationsMock}
      />
    );

    expect(screen.getByLabelText('Add a comment (optional)')).toBeInTheDocument();
  });

  it('shows input when AI assistant is enabled and isComplete is true', () => {
    jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: true,
      generateSummary: jest.fn(),
      isLoading: true,
      summary: '',
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
      errors: [],
      isComplete: true,
    });

    render(
      <AddToCaseComment
        comment=""
        setComment={jest.fn()}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={mockObservabilityAIAssistant}
        notifications={notificationsMock}
      />
    );

    expect(screen.getByLabelText('Add a comment (optional)')).toBeInTheDocument();
  });

  it('shows skeleton loader when AI assistant is enabled and comment is empty and isComplete is false', () => {
    jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: true,
      generateSummary: jest.fn(),
      isLoading: true,
      summary: '',
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
      errors: [],
      isComplete: false,
    });

    render(
      <AddToCaseComment
        comment=""
        setComment={jest.fn()}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={mockObservabilityAIAssistant}
        notifications={notificationsMock}
      />
    );

    expect(screen.getByTestId('addPageToCaseCommentSkeleton')).toBeInTheDocument();
  });

  it('displays AI assistant help text when enabled', () => {
    render(
      <AddToCaseComment
        comment=""
        setComment={jest.fn()}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={mockObservabilityAIAssistant}
        notifications={notificationsMock}
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
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
      errors: [],
      isComplete: false,
    });

    render(
      <AddToCaseComment
        comment=""
        setComment={jest.fn()}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={undefined}
        notifications={notificationsMock}
      />
    );

    expect(
      screen.queryByText(
        '{icon} Initial comment AI generated. AI can be wrong or incomplete. Please review and edit as necessary.'
      )
    ).not.toBeInTheDocument();
  });

  it('does not display AI assistant help text when there are errors', () => {
    jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: true,
      generateSummary: jest.fn(),
      isLoading: false,
      summary: '',
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
      errors: [new Error('Test error')],
      isComplete: false,
    });

    render(
      <AddToCaseComment
        comment=""
        setComment={jest.fn()}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={undefined}
        notifications={notificationsMock}
      />
    );

    expect(
      screen.queryByText(
        '{icon} Initial comment AI generated. AI can be wrong or incomplete. Please review and edit as necessary.'
      )
    ).not.toBeInTheDocument();
  });

  it('calls generateSummary when isObsAIAssistantEnabled is true and isComplete is false', () => {
    const generateSummaryMock = jest.fn();
    jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: true,
      generateSummary: generateSummaryMock,
      isLoading: false,
      summary: '',
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
      errors: [],
      isComplete: false,
    });

    render(
      <AddToCaseComment
        comment=""
        setComment={jest.fn()}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={mockObservabilityAIAssistant}
        notifications={notificationsMock}
      />
    );

    expect(generateSummaryMock).toHaveBeenCalled();
  });

  it('does not generateSummary when isObsAIAssistantEnabled is true and isComplete is true', () => {
    const generateSummaryMock = jest.fn();
    jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: false,
      generateSummary: generateSummaryMock,
      isLoading: false,
      summary: '',
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
      errors: [],
      isComplete: false,
    });

    render(
      <AddToCaseComment
        comment=""
        setComment={jest.fn()}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={mockObservabilityAIAssistant}
        notifications={notificationsMock}
      />
    );

    expect(generateSummaryMock).not.toHaveBeenCalled();
  });

  it('appends partial summaries to the comment using handleStreamingUpdate', () => {
    const onCommentChangeMock = jest.fn((prevComment) => `${prevComment} Partial summary`);
    const generateSummaryMock = jest.fn();
    const usePageSummarySpy = jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: true,
      generateSummary: generateSummaryMock,
      isLoading: false,
      summary: '',
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
      errors: [],
      isComplete: false,
    });

    render(
      <AddToCaseComment
        comment="Existing comment"
        setComment={onCommentChangeMock}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={mockObservabilityAIAssistant}
        notifications={notificationsMock}
      />
    );

    expect(onCommentChangeMock).not.toBeCalledWith(expect.any(Function));

    expect(screen.getByText('Existing comment')).toBeInTheDocument();

    expect(generateSummaryMock).toHaveBeenCalled();

    const handleStreamingUpdate = usePageSummarySpy.mock.calls[0]![0]!.onChunk!;
    handleStreamingUpdate(' Partial summary');

    expect(onCommentChangeMock).toBeCalledWith(expect.any(Function));
  });

  it('calls notifications.toasts.addError when errors are present', () => {
    jest.spyOn(usePageSummaryHook, 'usePageSummary').mockReturnValue({
      isObsAIAssistantEnabled: true,
      generateSummary: jest.fn(),
      isLoading: false,
      summary: '',
      abortController: { signal: new AbortController().signal, abort: jest.fn() },
      screenContexts: [],
      errors: [new Error('Test error')],
      isComplete: false,
    });

    render(
      <AddToCaseComment
        comment=""
        setComment={jest.fn()}
        setIsLoading={jest.fn()}
        observabilityAIAssistant={mockObservabilityAIAssistant}
        notifications={notificationsMock}
      />
    );

    expect(notificationsMock.toasts.addError).toHaveBeenCalledWith(expect.any(Error), {
      title: 'Could not initialize AI-generated summary',
    });
  });
});
