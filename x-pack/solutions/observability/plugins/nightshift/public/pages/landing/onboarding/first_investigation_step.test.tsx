/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { OnboardingSuggestionsExecution } from '@kbn/nightshift-investigations-plugin/common';
import { OnboardingFirstInvestigationStep } from './first_investigation_step';

const mockStartInvestigation = jest.fn();
const mockRetry = jest.fn();

jest.mock('../../../data/investigations/use_start_investigation', () => ({
  useStartInvestigation: () => ({ startInvestigation: mockStartInvestigation, isStarting: false }),
}));
jest.mock('./use_onboarding', () => ({
  useStartOnboardingSuggestions: () => ({ mutate: mockRetry, isLoading: false }),
}));
jest.mock('../../../components/entities/sandbox_connector/connect_sources_grid', () => ({
  ...jest.requireActual('../../../components/entities/sandbox_connector/connect_sources_grid'),
  ConnectSourcesGrid: ({ filter }: { filter: (id: string) => boolean }) => (
    <div data-test-subj={`grid-${filter.name}`} />
  ),
}));

const suggestion = (title: string, index: number) => ({
  title,
  prompt: `Prompt ${index}`,
  rationale: `Rationale ${index}`,
  source: 'alert' as const,
});

const renderStep = (execution: OnboardingSuggestionsExecution) =>
  render(<Step execution={execution} />);

const Step = ({ execution }: { execution: OnboardingSuggestionsExecution }) => (
  <I18nProvider>
    <OnboardingFirstInvestigationStep execution={execution} onInvestigationStarted={jest.fn()} />
  </I18nProvider>
);

describe('OnboardingFirstInvestigationStep', () => {
  beforeEach(() => jest.clearAllMocks());

  it('while the run is on, shows the analyzing banner and the additional knowledge sources', () => {
    renderStep({ execution_id: 'e1', status: 'running' });

    expect(screen.getByTestId('nightshiftOnboardingAnalyzing')).toHaveTextContent(
      'Gathering and triaging signals that can be investigated'
    );
    expect(screen.getByTestId('grid-isAdditionalType')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftOnboardingAnalyzing')).toHaveTextContent(
      'This usually takes 2 to 3 minutes and can take up to 5'
    );
    expect(screen.queryByTestId('nightshiftOnboardingSuggestions')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('nightshiftOnboardingCustomPrompt'), {
      target: { value: ' Why is checkout slow? ' },
    });
    fireEvent.click(screen.getByTestId('nightshiftOnboardingInvestigateButton'));
    expect(mockStartInvestigation).toHaveBeenCalledWith('Why is checkout slow?', undefined);
  });

  describe('while the run is on', () => {
    afterEach(() => jest.useRealTimers());

    it('shows the elapsed time, and no list, before the agent made a tool call', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-08T09:02:30.000Z'));
      renderStep({
        execution_id: 'e1',
        status: 'running',
        started_at: '2026-10-08T09:00:00.000Z',
      });

      expect(screen.getByTestId('nightshiftOnboardingAnalyzingElapsed')).toHaveTextContent(
        'Started 2 minutes ago'
      );
      expect(screen.queryByTestId('nightshiftOnboardingAnalyzingProgress')).not.toBeInTheDocument();
    });

    it('lists what the agent is doing, the latest first, folding repeats', () => {
      renderStep({
        execution_id: 'e1',
        status: 'running',
        started_at: '2026-10-08T09:00:00.000Z',
        progress: [
          { tool_call_id: 'c1', tool_id: 'bash', intent: 'Listing the data streams' },
          { tool_call_id: 'c2', tool_id: 'bash', intent: 'Checking active alerts' },
          { tool_call_id: 'c3', tool_id: 'bash', intent: 'Checking active alerts' },
          { tool_call_id: 'c4', tool_id: 'platform.core.search' },
        ],
      });

      const progress = screen.getByTestId('nightshiftOnboardingAnalyzingProgress');
      expect(progress).toHaveAttribute('role', 'status');
      expect(progress).toHaveAttribute('aria-live', 'polite');
      expect(
        within(progress)
          .getAllByTestId('nightshiftOnboardingAnalyzingProgressLine')
          .map((line) => line.textContent)
      ).toEqual([
        'Running platform.core.search',
        'Checking active alerts',
        'Listing the data streams',
      ]);
      expect(screen.queryByTestId('nightshiftOnboardingAnalyzingElapsed')).not.toBeInTheDocument();
    });

    it('shows the last four lines only', () => {
      renderStep({
        execution_id: 'e1',
        status: 'running',
        progress: Array.from({ length: 6 }, (_, i) => ({
          tool_call_id: `c${i}`,
          tool_id: 'bash',
          intent: `Step ${i}`,
        })),
      });

      expect(
        screen
          .getAllByTestId('nightshiftOnboardingAnalyzingProgressLine')
          .map((line) => line.textContent)
      ).toEqual(['Step 5', 'Step 4', 'Step 3', 'Step 2']);
    });

    it('shows a skeleton of three suggestions above the sources and the compose card', () => {
      renderStep({ execution_id: 'e1', status: 'running' });

      const skeleton = screen.getByTestId('nightshiftOnboardingSuggestionsSkeleton');
      expect(
        within(skeleton).getAllByTestId('nightshiftOnboardingSuggestionSkeletonRow')
      ).toHaveLength(3);
      const sources = screen.getByTestId('nightshiftOnboardingConnectSources');
      const compose = screen.getByTestId('nightshiftOnboardingCompose');
      expect(skeleton.compareDocumentPosition(sources)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(sources.compareDocumentPosition(compose)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('keeps the sources and the typed question in place when the suggestions arrive', () => {
      const { rerender } = renderStep({ execution_id: 'e1', status: 'running' });
      const sources = screen.getByTestId('nightshiftOnboardingConnectSources');
      const textArea = screen.getByTestId('nightshiftOnboardingCustomPrompt');
      fireEvent.change(textArea, { target: { value: 'Why is checkout slow?' } });
      textArea.focus();

      rerender(
        <Step
          execution={{ execution_id: 'e1', status: 'succeeded', suggestions: [suggestion('S', 0)] }}
        />
      );

      expect(screen.getByTestId('nightshiftOnboardingSuggestions')).toBeInTheDocument();
      expect(
        screen.queryByTestId('nightshiftOnboardingSuggestionsSkeleton')
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('nightshiftOnboardingAnalyzing')).not.toBeInTheDocument();
      expect(screen.getByTestId('nightshiftOnboardingConnectSources')).toBe(sources);
      expect(screen.getByTestId('nightshiftOnboardingCustomPrompt')).toBe(textArea);
      expect(textArea).toHaveValue('Why is checkout slow?');
      expect(textArea).toHaveFocus();
    });
  });

  it('keeps Investigate enabled when empty: it focuses the question with a hint, and starts nothing', () => {
    renderStep({ execution_id: 'e1', status: 'running' });

    const investigate = screen.getByTestId('nightshiftOnboardingInvestigateButton');
    expect(investigate).toBeEnabled();
    expect(screen.queryByTestId('nightshiftOnboardingComposeHint')).not.toBeInTheDocument();

    fireEvent.click(investigate);

    expect(screen.getByTestId('nightshiftOnboardingCustomPrompt')).toHaveFocus();
    expect(screen.getByTestId('nightshiftOnboardingComposeHint')).toHaveTextContent(
      'Describe a question first, or pick an example.'
    );
    expect(mockStartInvestigation).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('nightshiftOnboardingCustomPrompt'), {
      target: { value: 'Why?' },
    });
    expect(screen.queryByTestId('nightshiftOnboardingComposeHint')).not.toBeInTheDocument();
  });

  it('fills and focuses the question from an example, which then investigates', () => {
    renderStep({ execution_id: 'e1', status: 'running' });

    const examples = screen.getAllByTestId('nightshiftOnboardingExample');
    expect(examples.length).toBeGreaterThanOrEqual(3);
    fireEvent.click(examples[0]);

    const textArea = screen.getByTestId('nightshiftOnboardingCustomPrompt');
    expect(textArea).toHaveValue('Why is checkout latency up?');
    expect(textArea).toHaveFocus();

    fireEvent.click(screen.getByTestId('nightshiftOnboardingInvestigateButton'));
    expect(mockStartInvestigation).toHaveBeenCalledWith('Why is checkout latency up?', undefined);
  });

  it('lists the suggestions with an Investigate each, five at a time', () => {
    renderStep({
      execution_id: 'e1',
      status: 'succeeded',
      suggestions: Array.from({ length: 7 }, (_, i) => suggestion(`Suggestion ${i}`, i)),
    });

    expect(screen.getAllByTestId('nightshiftOnboardingSuggestion')).toHaveLength(5);
    const first = screen.getAllByTestId('nightshiftOnboardingSuggestion')[0];
    expect(first).toHaveTextContent('Alert');
    expect(first).toHaveTextContent('Suggestion 0');
    expect(first).toHaveTextContent('Rationale 0');

    fireEvent.click(within(first).getByTestId('nightshiftOnboardingSuggestionInvestigateButton'));
    expect(mockStartInvestigation).toHaveBeenCalledWith('Prompt 0', 'Suggestion 0');

    const showMore = screen.getByTestId('nightshiftOnboardingSuggestionsShowMore');
    expect(showMore).toHaveTextContent('Show 2 more of 2');
    fireEvent.click(showMore);
    expect(screen.getAllByTestId('nightshiftOnboardingSuggestion')).toHaveLength(7);
    expect(screen.queryByTestId('nightshiftOnboardingSuggestionsShowMore')).not.toBeInTheDocument();
  });

  it('investigates a custom question from the compose card', () => {
    renderStep({ execution_id: 'e1', status: 'succeeded', suggestions: [suggestion('S', 0)] });

    const compose = screen.getByTestId('nightshiftOnboardingCompose');
    expect(compose).toHaveTextContent('Ask your own question');
    const investigate = screen.getByTestId('nightshiftOnboardingInvestigateButton');

    fireEvent.change(screen.getByTestId('nightshiftOnboardingCustomPrompt'), {
      target: { value: ' Why is checkout slow? ' },
    });
    expect(investigate).toBeEnabled();
    fireEvent.click(investigate);

    expect(mockStartInvestigation).toHaveBeenCalledWith('Why is checkout slow?', undefined);
  });

  it.each<[string, OnboardingSuggestionsExecution]>([
    ['the run failed', { execution_id: 'e1', status: 'failed', error: 'boom' }],
    ['the run found nothing', { execution_id: 'e1', status: 'succeeded', suggestions: [] }],
  ])('shows an empty state with a retry, and no suggestions or warning, when %s', (_, run) => {
    renderStep(run);

    expect(screen.getByTestId('nightshiftOnboardingSuggestionsEmpty')).toHaveTextContent(
      'No investigation suggestions found'
    );
    expect(screen.queryByTestId('nightshiftOnboardingSuggestions')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('nightshiftOnboardingCompose')).toHaveTextContent(
      'Ask your own question'
    );
    expect(screen.getByTestId('nightshiftOnboardingInvestigateButton')).toBeEnabled();
    expect(screen.getByTestId('nightshiftOnboardingConnectSources')).toBeInTheDocument();
    expect(screen.getByTestId('grid-isAdditionalType')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftOnboardingRetryButton'));
    expect(mockRetry).toHaveBeenCalled();
  });
});
