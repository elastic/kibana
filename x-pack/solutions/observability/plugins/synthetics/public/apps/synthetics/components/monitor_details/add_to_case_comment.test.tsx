/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddToCaseComment } from './add_to_case_comment';
import * as usePageSummaryHooks from '../../hooks/use_page_summary';

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => <>{defaultMessage}</>,
}));

jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: (id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
  },
}));

const mockSetIsLoading = jest.fn();
const mockOnCommentChange = jest.fn();

describe('AddToCaseComment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the input field with the provided comment', () => {
    // @ts-ignore next line
    jest.spyOn(usePageSummaryHooks, 'usePageSummary').mockReturnValue({
      generateSummary: jest.fn(),
      isObsAIAssistantEnabled: false,
      isLoading: false,
    });

    render(
      <AddToCaseComment
        comment="Initial comment"
        onCommentChange={mockOnCommentChange}
        setIsLoading={mockSetIsLoading}
      />
    );

    const textArea = screen.getByPlaceholderText('Add a comment (optional)');
    expect(textArea).toBeInTheDocument();
    expect(textArea).toHaveValue('Initial comment');
  });

  it('should call onCommentChange when the input value changes', () => {
    render(
      <AddToCaseComment
        comment=""
        onCommentChange={mockOnCommentChange}
        setIsLoading={mockSetIsLoading}
      />
    );

    const textArea = screen.getByPlaceholderText('Add a comment (optional)');
    fireEvent.change(textArea, { target: { value: 'New comment' } });

    expect(mockOnCommentChange).toHaveBeenCalledWith('New comment');
  });

  it('should show a skeleton loader when loading', () => {
    // @ts-ignore next line
    jest.spyOn(usePageSummaryHooks, 'usePageSummary').mockReturnValue({
      generateSummary: jest.fn(),
      isObsAIAssistantEnabled: true,
      isLoading: true,
    });

    render(
      <AddToCaseComment
        comment=""
        onCommentChange={mockOnCommentChange}
        setIsLoading={mockSetIsLoading}
      />
    );

    const skeleton = screen.getByTestId('syntheticsAddToCaseCommentSkeleton');
    expect(skeleton).toBeInTheDocument();
  });

  it('should call setIsLoading based on loading state', () => {
    // @ts-ignore next line
    jest.spyOn(usePageSummaryHooks, 'usePageSummary').mockReturnValue({
      generateSummary: jest.fn(),
      isObsAIAssistantEnabled: true,
      isLoading: true,
    });

    render(
      <AddToCaseComment
        comment=""
        onCommentChange={mockOnCommentChange}
        setIsLoading={mockSetIsLoading}
      />
    );

    expect(mockSetIsLoading).toHaveBeenCalledWith(true);
  });

  it('sets loading to false is ai assistant is not available', () => {
    // @ts-ignore next line
    jest.spyOn(usePageSummaryHooks, 'usePageSummary').mockReturnValue({
      generateSummary: jest.fn(),
      isObsAIAssistantEnabled: false,
      isLoading: true,
    });

    render(
      <AddToCaseComment
        comment=""
        onCommentChange={mockOnCommentChange}
        setIsLoading={mockSetIsLoading}
      />
    );

    expect(mockSetIsLoading).toHaveBeenCalledWith(false);
  });

  it('should call generateSummary when AI assistant is enabled', () => {
    const mockGenerateSummary = jest.fn();
    // @ts-ignore next line
    jest.spyOn(usePageSummaryHooks, 'usePageSummary').mockReturnValue({
      generateSummary: mockGenerateSummary,
      isObsAIAssistantEnabled: true,
      isLoading: false,
    });

    render(
      <AddToCaseComment
        comment=""
        onCommentChange={mockOnCommentChange}
        setIsLoading={mockSetIsLoading}
      />
    );

    expect(mockGenerateSummary).toHaveBeenCalled();
  });

  it('should not call generateSummary when AI assistant is disabled', () => {
    const mockGenerateSummary = jest.fn();
    // @ts-ignore next line
    jest.spyOn(usePageSummaryHooks, 'usePageSummary').mockReturnValue({
      generateSummary: mockGenerateSummary,
      isObsAIAssistantEnabled: false,
      isLoading: false,
    });

    render(
      <AddToCaseComment
        comment=""
        onCommentChange={mockOnCommentChange}
        setIsLoading={mockSetIsLoading}
      />
    );

    expect(mockGenerateSummary).not.toHaveBeenCalled();
  });
});
