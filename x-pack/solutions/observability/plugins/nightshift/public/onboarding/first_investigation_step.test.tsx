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

jest.mock('../data/investigations/use_start_investigation', () => ({
  useStartInvestigation: () => ({ startInvestigation: mockStartInvestigation, isStarting: false }),
}));
jest.mock('./use_onboarding', () => ({
  useStartOnboardingSuggestions: () => ({ mutate: mockRetry, isLoading: false }),
}));
jest.mock('../sandbox_connectors/connect_sources_grid', () => ({
  ConnectSourcesGrid: ({ group }: { group: string }) => <div data-test-subj={`grid-${group}`} />,
}));

const suggestion = (title: string, index: number) => ({
  title,
  prompt: `Prompt ${index}`,
  rationale: `Rationale ${index}`,
  source: 'alert' as const,
});

const renderStep = (execution: OnboardingSuggestionsExecution) =>
  render(
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
    expect(screen.getByTestId('grid-additional')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftOnboardingSuggestions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftOnboardingCompose')).not.toBeInTheDocument();
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
    expect(showMore).toHaveTextContent('Show 2 more');
    fireEvent.click(showMore);
    expect(screen.getAllByTestId('nightshiftOnboardingSuggestion')).toHaveLength(7);
    expect(screen.queryByTestId('nightshiftOnboardingSuggestionsShowMore')).not.toBeInTheDocument();
  });

  it('investigates a custom question from the compose card', () => {
    renderStep({ execution_id: 'e1', status: 'succeeded', suggestions: [suggestion('S', 0)] });

    const compose = screen.getByTestId('nightshiftOnboardingCompose');
    expect(compose).toHaveTextContent('Want something else investigated?');
    const investigate = screen.getByTestId('nightshiftOnboardingInvestigateButton');
    expect(investigate).toBeDisabled();

    fireEvent.change(screen.getByTestId('nightshiftOnboardingCustomPrompt'), {
      target: { value: ' Why is checkout slow? ' },
    });
    expect(investigate).toBeEnabled();
    fireEvent.click(investigate);

    expect(mockStartInvestigation).toHaveBeenCalledWith('Why is checkout slow?', undefined);
  });

  it('falls back to general questions with a retry when the run failed', () => {
    renderStep({ execution_id: 'e1', status: 'failed', error: 'boom' });

    expect(
      screen.getByText('Nightshift could not suggest investigations for your data')
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('nightshiftOnboardingSuggestion')).toHaveLength(3);
    fireEvent.click(screen.getByTestId('nightshiftOnboardingRetryButton'));
    expect(mockRetry).toHaveBeenCalled();
  });
});
