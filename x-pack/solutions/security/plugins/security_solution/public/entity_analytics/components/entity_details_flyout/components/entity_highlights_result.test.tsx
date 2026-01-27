/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntityHighlightsResult } from './entity_highlights_result';
import { TestProviders } from '../../../../common/mock';

describe('EntityHighlightsResult', () => {
  const mockOnRefresh = jest.fn();

  const defaultAssistantResult = {
    response: {
      highlights: [
        {
          title: 'Risk Score',
          text: 'User has high risk activity with multiple failed login attempts.',
        },
        {
          title: 'Asset Criticality',
          text: 'The asset is critical.',
        },
      ],
      recommendedActions: ['Review login attempts', 'Check user permissions'],
    },
    replacements: { anonymized_user: 'test-user' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders highlights with titles and markdown text', () => {
    render(
      <EntityHighlightsResult
        assistantResult={defaultAssistantResult}
        showAnonymizedValues={false}
        generatedAt={null}
        onRefresh={mockOnRefresh}
      />,
      { wrapper: TestProviders }
    );

    expect(screen.getByText('Risk Score')).toBeInTheDocument();
    expect(
      screen.getByText('User has high risk activity with multiple failed login attempts.')
    ).toBeInTheDocument();
    expect(screen.getByText('Asset Criticality')).toBeInTheDocument();
    expect(screen.getByText('The asset is critical.')).toBeInTheDocument();
  });

  it('renders recommended actions section when available', () => {
    render(
      <EntityHighlightsResult
        assistantResult={defaultAssistantResult}
        showAnonymizedValues={false}
        generatedAt={null}
        onRefresh={mockOnRefresh}
      />,
      { wrapper: TestProviders }
    );

    expect(screen.getByText('Recommended actions')).toBeInTheDocument();
    expect(screen.getByText('Review login attempts', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Check user permissions', { exact: false })).toBeInTheDocument();
  });

  it('handles empty highlights array (shows empty state message)', () => {
    const emptyResult = {
      response: {
        highlights: [],
        recommendedActions: null,
      },
      replacements: {},
    };

    render(
      <EntityHighlightsResult
        assistantResult={emptyResult}
        showAnonymizedValues={false}
        generatedAt={null}
        onRefresh={mockOnRefresh}
      />,
      { wrapper: TestProviders }
    );

    expect(
      screen.getByText("There's not enough data to create an AI summary.")
    ).toBeInTheDocument();
  });

  it('shows anonymized values when showAnonymizedValues is true', () => {
    const resultWithAnonymized = {
      response: {
        highlights: [
          {
            title: 'Key Insights',
            text: 'User [anonymized_user] has high risk activity.',
          },
        ],
        recommendedActions: null,
      },
      replacements: { anonymized_user: 'test-user' },
    };

    render(
      <EntityHighlightsResult
        assistantResult={resultWithAnonymized}
        showAnonymizedValues={true}
        generatedAt={null}
        onRefresh={mockOnRefresh}
      />,
      { wrapper: TestProviders }
    );

    expect(screen.getByText('User [anonymized_user] has high risk activity.')).toBeInTheDocument();
  });

  it('shows original values when showAnonymizedValues is false', () => {
    const resultWithAnonymized = {
      response: {
        highlights: [
          {
            title: 'Key Insights',
            text: 'User [anonymized_user] has high risk activity.',
          },
        ],
        recommendedActions: null,
      },
      replacements: { anonymized_user: 'test-user' },
    };

    render(
      <EntityHighlightsResult
        assistantResult={resultWithAnonymized}
        showAnonymizedValues={false}
        generatedAt={null}
        onRefresh={mockOnRefresh}
      />,
      { wrapper: TestProviders }
    );

    // Check that the original value appears (not the anonymized one)
    expect(screen.getByText(/test-user/)).toBeInTheDocument();
    expect(screen.queryByText(/\[anonymized_user\]/)).not.toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', () => {
    render(
      <EntityHighlightsResult
        assistantResult={defaultAssistantResult}
        showAnonymizedValues={false}
        generatedAt={null}
        onRefresh={mockOnRefresh}
      />,
      { wrapper: TestProviders }
    );

    const refreshButton = screen.getByLabelText('Regenerate summary');
    fireEvent.click(refreshButton);

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('displays timestamp when generatedAt is provided', () => {
    const generatedAt = new Date('2024-01-15T10:30:00Z').getTime();

    render(
      <EntityHighlightsResult
        assistantResult={defaultAssistantResult}
        showAnonymizedValues={false}
        generatedAt={generatedAt}
        onRefresh={mockOnRefresh}
      />,
      { wrapper: TestProviders }
    );

    expect(screen.getByText(/Generated by AI on/)).toBeInTheDocument();
    // The timestamp format may vary, so we check for parts of it
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('does not display timestamp when generatedAt is null', () => {
    render(
      <EntityHighlightsResult
        assistantResult={defaultAssistantResult}
        showAnonymizedValues={false}
        generatedAt={null}
        onRefresh={mockOnRefresh}
      />,
      { wrapper: TestProviders }
    );

    expect(screen.queryByText(/Generated by AI on/)).not.toBeInTheDocument();
  });

  it('returns null when assistantResult is null', () => {
    const { container } = render(
      <EntityHighlightsResult
        assistantResult={null}
        showAnonymizedValues={false}
        generatedAt={null}
        onRefresh={mockOnRefresh}
      />,
      { wrapper: TestProviders }
    );

    expect(container.firstChild).toBeNull();
  });

  it('returns null when response is null', () => {
    const resultWithNullResponse = {
      response: null,
      replacements: {},
    };

    const { container } = render(
      <EntityHighlightsResult
        assistantResult={resultWithNullResponse}
        showAnonymizedValues={false}
        generatedAt={null}
        onRefresh={mockOnRefresh}
      />,
      { wrapper: TestProviders }
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders copy button when textToCopy is available', () => {
    render(
      <EntityHighlightsResult
        assistantResult={defaultAssistantResult}
        showAnonymizedValues={false}
        generatedAt={null}
        onRefresh={mockOnRefresh}
      />,
      { wrapper: TestProviders }
    );

    expect(screen.getByLabelText('Copy summary')).toBeInTheDocument();
  });

  it('does not render copy button when there are no highlights', () => {
    const emptyResult = {
      response: {
        highlights: [],
        recommendedActions: null,
      },
      replacements: {},
    };

    render(
      <EntityHighlightsResult
        assistantResult={emptyResult}
        showAnonymizedValues={false}
        generatedAt={null}
        onRefresh={mockOnRefresh}
      />,
      { wrapper: TestProviders }
    );

    expect(screen.queryByLabelText('Copy summary')).not.toBeInTheDocument();
  });

  it('handles recommended actions with anonymized values', () => {
    const resultWithAnonymizedActions = {
      response: {
        highlights: [
          {
            title: 'Key Insights',
            text: 'User activity detected.',
          },
        ],
        recommendedActions: ['Review [anonymized_user] permissions'],
      },
      replacements: { anonymized_user: 'test-user' },
    };

    render(
      <EntityHighlightsResult
        assistantResult={resultWithAnonymizedActions}
        showAnonymizedValues={false}
        generatedAt={null}
        onRefresh={mockOnRefresh}
      />,
      { wrapper: TestProviders }
    );

    // Check that the original value appears in recommended actions
    expect(screen.getByText(/test-user/)).toBeInTheDocument();
    expect(screen.getByText(/Review/)).toBeInTheDocument();
    expect(screen.queryByText(/\[anonymized_user\]/)).not.toBeInTheDocument();
  });

  it('handles recommended actions with anonymized values when showAnonymizedValues is true', () => {
    const resultWithAnonymizedActions = {
      response: {
        highlights: [
          {
            title: 'Key Insights',
            text: 'User activity detected.',
          },
        ],
        recommendedActions: ['Review [anonymized_user] permissions'],
      },
      replacements: { anonymized_user: 'test-user' },
    };

    render(
      <EntityHighlightsResult
        assistantResult={resultWithAnonymizedActions}
        showAnonymizedValues={true}
        generatedAt={null}
        onRefresh={mockOnRefresh}
      />,
      { wrapper: TestProviders }
    );

    expect(
      screen.getByText('Review [anonymized_user] permissions', { exact: false })
    ).toBeInTheDocument();
  });

  it('does not render recommended actions section when recommendedActions is null', () => {
    const resultWithoutActions = {
      response: {
        highlights: [
          {
            title: 'Key Insights',
            text: 'User activity detected.',
          },
        ],
        recommendedActions: null,
      },
      replacements: {},
    };

    render(
      <EntityHighlightsResult
        assistantResult={resultWithoutActions}
        showAnonymizedValues={false}
        generatedAt={null}
        onRefresh={mockOnRefresh}
      />,
      { wrapper: TestProviders }
    );

    expect(screen.queryByText('Recommended actions')).not.toBeInTheDocument();
  });

  it('does not render recommended actions section when recommendedActions is empty array', () => {
    const resultWithEmptyActions = {
      response: {
        highlights: [
          {
            title: 'Key Insights',
            text: 'User activity detected.',
          },
        ],
        recommendedActions: [],
      },
      replacements: {},
    };

    render(
      <EntityHighlightsResult
        assistantResult={resultWithEmptyActions}
        showAnonymizedValues={false}
        generatedAt={null}
        onRefresh={mockOnRefresh}
      />,
      { wrapper: TestProviders }
    );

    expect(screen.queryByText('Recommended actions')).not.toBeInTheDocument();
  });
});
