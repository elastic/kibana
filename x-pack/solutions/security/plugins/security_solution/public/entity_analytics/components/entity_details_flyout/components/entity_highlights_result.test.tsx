/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntityHighlightsResult, joinSignalLabels } from './entity_highlights_result';
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
      recommended_actions: ['Review login attempts', 'Check user permissions'],
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
        recommended_actions: null,
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
        recommended_actions: null,
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
        recommended_actions: null,
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
        recommended_actions: null,
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
        recommended_actions: ['Review [anonymized_user] permissions'],
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
        recommended_actions: ['Review [anonymized_user] permissions'],
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

  it('does not render recommended actions section when recommended_actions is null', () => {
    const resultWithoutActions = {
      response: {
        highlights: [
          {
            title: 'Key Insights',
            text: 'User activity detected.',
          },
        ],
        recommended_actions: null,
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

  it('does not render recommended actions section when recommended_actions is empty array', () => {
    const resultWithEmptyActions = {
      response: {
        highlights: [
          {
            title: 'Key Insights',
            text: 'User activity detected.',
          },
        ],
        recommended_actions: [],
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

  describe('staleness warning callout', () => {
    it('does not render the callout when there are no staleness reasons', () => {
      render(
        <EntityHighlightsResult
          assistantResult={defaultAssistantResult}
          showAnonymizedValues={false}
          generatedAt={null}
          onRefresh={mockOnRefresh}
        />,
        { wrapper: TestProviders }
      );

      expect(screen.queryByTestId('entity-highlights-staleness-callout')).not.toBeInTheDocument();
    });

    it('renders a single EUI warning callout with a risk-specific header and one regenerate action', () => {
      render(
        <EntityHighlightsResult
          assistantResult={defaultAssistantResult}
          showAnonymizedValues={false}
          generatedAt={null}
          stalenessReasons={[{ signal: 'risk_score', previousScore: 70, currentScore: 90 }]}
          onRefresh={mockOnRefresh}
        />,
        { wrapper: TestProviders }
      );

      const callout = screen.getByTestId('entity-highlights-staleness-callout');
      expect(callout).toBeInTheDocument();
      expect(
        screen.getByText('Entity risk has changed since this summary was generated')
      ).toBeInTheDocument();

      // Single regenerate action inside the callout — the old dual-button UI is gone.
      expect(screen.getByTestId('entity-highlights-staleness-regenerate')).toBeInTheDocument();
      expect(
        screen.queryByTestId('entity-highlights-staleness-inline-regenerate')
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('entity-highlights-staleness-inline')).not.toBeInTheDocument();
    });

    it('renders a single reason as plain text rather than a bulleted list', () => {
      render(
        <EntityHighlightsResult
          assistantResult={defaultAssistantResult}
          showAnonymizedValues={false}
          generatedAt={null}
          stalenessReasons={[
            { signal: 'risk_score', previousScore: 87.1264933848, currentScore: 62.8525224705 },
          ]}
          onRefresh={mockOnRefresh}
        />,
        { wrapper: TestProviders }
      );

      // Scores are rounded to 2 decimals via formatRiskScore, not shown raw.
      const reason = screen.getByText('Risk score changed from 87.13 to 62.85');
      expect(reason.tagName).toBe('P');
      expect(reason.closest('li')).toBeNull();
    });

    it('lists multiple reasons as a bulleted list', () => {
      render(
        <EntityHighlightsResult
          assistantResult={defaultAssistantResult}
          showAnonymizedValues={false}
          generatedAt={null}
          stalenessReasons={[
            { signal: 'risk_score', previousScore: 70, currentScore: 90 },
            { signal: 'risk_score', previousScore: 50, currentScore: 80 },
          ]}
          onRefresh={mockOnRefresh}
        />,
        { wrapper: TestProviders }
      );

      expect(
        screen.getByText('Risk score changed from 70.00 to 90.00').closest('li')
      ).not.toBeNull();
      expect(
        screen.getByText('Risk score changed from 50.00 to 80.00').closest('li')
      ).not.toBeNull();
    });

    it('calls onRefresh when the callout regenerate button is clicked', () => {
      render(
        <EntityHighlightsResult
          assistantResult={defaultAssistantResult}
          showAnonymizedValues={false}
          generatedAt={null}
          stalenessReasons={[{ signal: 'risk_score', previousScore: 70, currentScore: 90 }]}
          onRefresh={mockOnRefresh}
        />,
        { wrapper: TestProviders }
      );

      fireEvent.click(screen.getByTestId('entity-highlights-staleness-regenerate'));

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
  });
});

describe('joinSignalLabels', () => {
  it('returns an empty string for no labels', () => {
    expect(joinSignalLabels([])).toBe('');
  });

  it('returns the single label unchanged', () => {
    expect(joinSignalLabels(['Entity risk'])).toBe('Entity risk');
  });

  it('joins two labels with "and"', () => {
    expect(joinSignalLabels(['Entity risk', 'Anomalies'])).toBe('Entity risk and Anomalies');
  });

  it('joins three or more labels with commas and a trailing "and"', () => {
    expect(joinSignalLabels(['Entity risk', 'Anomalies', 'Rules'])).toBe(
      'Entity risk, Anomalies, and Rules'
    );
  });
});
