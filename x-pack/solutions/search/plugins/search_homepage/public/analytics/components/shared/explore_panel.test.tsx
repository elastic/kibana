/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  EVENT_SOURCE_FIXTURES,
  toEventSource,
} from '../../../../common/__fixtures__/analytics_event_sources';
import { ANALYTICS_PREFERENCES_STORAGE_KEY } from '../../constants';
import type { SourceGenerationResult } from '../../hooks/use_source_generation';
import { UNAVAILABLE_SOURCE_GENERATION } from '../../hooks/use_source_generation';
import type { AnalyticsEventSource, AnalyticsLinks, AnalyticsUseCaseId } from '../../types';
import { ExplorePanel } from './explore_panel';
import {
  EVENT_SOURCE,
  SAMPLE_EVENT_SOURCE,
  createGeneration,
  createGenerationResult,
  createLinksMock,
} from './test_helpers';

const fixture = (id: string): AnalyticsEventSource => {
  const found = EVENT_SOURCE_FIXTURES.find((candidate) => candidate.id === id);
  if (found === undefined) {
    throw new Error(`No fixture named ${id}`);
  }
  return toEventSource(found);
};

describe('ExplorePanel with detected fields', () => {
  const setup = (source: AnalyticsEventSource, selectedUseCaseId?: AnalyticsUseCaseId): void => {
    if (selectedUseCaseId !== undefined) {
      localStorage.setItem(
        ANALYTICS_PREFERENCES_STORAGE_KEY,
        JSON.stringify({ selectedUseCaseId })
      );
    }
    render(
      <EuiThemeProvider>
        <ExplorePanel
          page="home"
          headingElement="h2"
          sources={[source]}
          totalSources={1}
          selectedSource={source}
          onSelectSource={jest.fn()}
          showAgentEntry={false}
          links={createLinksMock()}
        />
      </EuiThemeProvider>
    );
  };
  const getQuestions = (): Array<string | null> =>
    screen
      .getAllByTestId(/^analyticsHome(QueryToggle-|Query-)/)
      .map((element) => element.querySelector('.euiText')?.textContent ?? null);

  afterEach(() => {
    localStorage.clear();
  });

  it('opens on the most insightful question and says what the events look like', () => {
    setup(fixture('payments'));

    expect(getQuestions()).toEqual([
      'Which merchant category has the highest total amount?',
      'How are events split by status?',
      'How does the total amount change from day to day?',
      'Which customers generate the most events?',
      'Which payment method has the most events and customers?',
    ]);
    expect(screen.getByTestId('analyticsHomeQueryCode-source_measure_by_dimension')).toBeVisible();
    expect(screen.getByTestId('analyticsHomeExploreUseCaseNote')).toHaveTextContent(
      'These look like payment events.'
    );
  });

  it('follows the selected use case without commenting on it', () => {
    setup(fixture('payments'), 'gaming');

    expect(getQuestions()[0]).toBe('How many customers are active each day?');
    expect(screen.queryByTestId('analyticsHomeExploreUseCaseNote')).not.toBeInTheDocument();
  });

  it('says nothing about a source whose fields point nowhere', () => {
    setup(EVENT_SOURCE);

    expect(getQuestions()[0]).toBe('What do the latest events look like?');
    expect(screen.queryByTestId('analyticsHomeExploreUseCaseNote')).not.toBeInTheDocument();
  });
});

describe('ExplorePanel with generated questions', () => {
  const BUILT_IN_FIRST = 'What do the latest events look like?';
  const GENERATED_FIRST = 'Which payment methods are declined most often?';
  const ready = (overrides: Partial<SourceGenerationResult> = {}): SourceGenerationResult =>
    createGenerationResult({ status: 'ready', data: createGeneration(), ...overrides });

  const setup = (
    initialGeneration: SourceGenerationResult | undefined,
    source: AnalyticsEventSource = EVENT_SOURCE
  ) => {
    const links: AnalyticsLinks = createLinksMock();
    const renderPanel = (generation: SourceGenerationResult | undefined) => (
      <EuiThemeProvider>
        <ExplorePanel
          page="home"
          headingElement="h2"
          sources={[source]}
          totalSources={1}
          selectedSource={source}
          onSelectSource={jest.fn()}
          showAgentEntry={false}
          links={links}
          generation={generation}
        />
      </EuiThemeProvider>
    );
    const { rerender } = render(renderPanel(initialGeneration));

    return {
      links,
      update: (generation: SourceGenerationResult) => rerender(renderPanel(generation)),
    };
  };
  const getQuestions = (): Array<string | null> =>
    screen
      .getAllByTestId(/^analyticsHome(QueryToggle-|Query-)/)
      .map((element) => element.querySelector('.euiText')?.textContent ?? null);
  const getStatus = (): HTMLElement => screen.getByTestId('analyticsHomeGenerationStatus');

  it('shows the built-in questions at once and says that generated ones are being written', () => {
    setup(createGenerationResult({ status: 'pending' }));

    expect(getQuestions()[0]).toBe(BUILT_IN_FIRST);
    expect(getStatus()).toHaveTextContent('Writing questions for your data…');
    expect(screen.queryByTestId('analyticsHomeGenerationRegenerate')).not.toBeInTheDocument();
  });

  it('replaces the built-in questions when the generated ones arrive and the list was left alone', () => {
    const { update, links } = setup(createGenerationResult({ status: 'pending' }));
    const focused = screen.getByTestId('analyticsHomeExploreTitle');
    focused.tabIndex = -1;
    focused.focus();

    update(ready());

    expect(getQuestions()).toEqual([
      GENERATED_FIRST,
      'Do 3-D Secure payments fail less?',
      'Which decline reasons are most common?',
    ]);
    expect(screen.getByTestId('analyticsHomeQueryCode-generated_1')).toBeVisible();
    expect(screen.getByTestId('analyticsHomeExploreSummary')).toHaveTextContent(
      'Card payments with declines in three currencies.'
    );
    expect(getStatus()).toHaveTextContent('Generated for your data');
    expect(screen.getByTestId('analyticsHomeGenerationRegenerate')).toBeInTheDocument();
    expect(focused).toHaveFocus();

    fireEvent.click(screen.getByTestId('analyticsHomeOpenInDiscover-generated_1'));
    expect(links.openDiscover).toHaveBeenCalledWith(
      expect.stringContaining('STATS declined = COUNT(*) WHERE status == "declined"')
    );
  });

  it('shows generated questions straight away when they are already there', () => {
    setup(ready());

    expect(getQuestions()[0]).toBe(GENERATED_FIRST);
  });

  it('holds the generated questions back once the user has expanded a question', () => {
    const { update } = setup(createGenerationResult({ status: 'pending' }));
    fireEvent.click(screen.getByTestId('analyticsHomeQueryToggle-source_event_count'));

    update(ready());

    expect(getQuestions()[0]).toBe(BUILT_IN_FIRST);
    expect(screen.getByTestId('analyticsHomeQueryCode-source_event_count')).toBeVisible();
    expect(getStatus()).toHaveTextContent('Questions written for your data are ready.');
    expect(screen.queryByTestId('analyticsHomeExploreSummary')).not.toBeInTheDocument();
  });

  it.each([
    ['the pointer', fireEvent.mouseEnter],
    ['the focus', fireEvent.focus],
  ])('holds them back while %s is in the list', (_, enter) => {
    const { update } = setup(createGenerationResult({ status: 'pending' }));
    enter(screen.getByTestId('analyticsHomeExploreQueries'));

    update(ready());

    expect(getQuestions()[0]).toBe(BUILT_IN_FIRST);
    expect(screen.getByTestId('analyticsHomeGenerationShow')).toBeInTheDocument();
  });

  it('shows held-back questions when asked, and keeps the focus on the control', () => {
    const { update } = setup(createGenerationResult({ status: 'pending' }));
    fireEvent.click(screen.getByTestId('analyticsHomeQueryToggle-source_event_count'));
    update(ready());

    const showButton = screen.getByTestId('analyticsHomeGenerationShow');
    showButton.focus();
    fireEvent.click(showButton);

    expect(getQuestions()[0]).toBe(GENERATED_FIRST);
    expect(screen.queryByTestId('analyticsHomeGenerationShow')).not.toBeInTheDocument();
    expect(screen.getByTestId('analyticsHomeGenerationRegenerate')).toHaveFocus();
  });

  it('regenerates on request and shows the new questions even when the list was used', () => {
    const regenerate = jest.fn();
    const { update } = setup(ready({ regenerate }));
    fireEvent.click(screen.getByTestId('analyticsHomeQueryToggle-generated_2'));

    fireEvent.click(screen.getByTestId('analyticsHomeGenerationRegenerate'));
    expect(regenerate).toHaveBeenCalledTimes(1);

    update(ready({ regenerate, isRegenerating: true }));
    expect(getQuestions()[0]).toBe(GENERATED_FIRST);
    expect(screen.getByTestId('analyticsHomeGenerationRegenerate')).toBeDisabled();

    update(
      ready({
        regenerate,
        data: createGeneration({
          generatedAt: 2,
          queries: [
            {
              id: 'generated_1',
              question: 'Which merchants refund most?',
              esql: 'FROM a | LIMIT 1',
            },
            { id: 'generated_2', question: 'Second?', esql: 'FROM a | LIMIT 2' },
            { id: 'generated_3', question: 'Third?', esql: 'FROM a | LIMIT 3' },
          ],
        }),
      })
    );
    expect(getQuestions()[0]).toBe('Which merchants refund most?');
  });

  it('keeps the earlier generated questions with a quiet note when regenerating fails', () => {
    const { update } = setup(ready());

    update(ready({ hasRegenerateFailed: true }));

    expect(getQuestions()[0]).toBe(GENERATED_FIRST);
    expect(getStatus()).toHaveTextContent(
      'New questions could not be written. These are the earlier ones.'
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['generation fails', createGenerationResult({ status: 'failed' })],
    [
      'too few generated questions passed validation',
      createGenerationResult({ status: 'ready', data: createGeneration({ queries: null }) }),
    ],
  ])('keeps the built-in questions and shows no error when %s', (_, failed) => {
    const { update } = setup(createGenerationResult({ status: 'pending' }));

    update(failed);

    expect(getQuestions()[0]).toBe(BUILT_IN_FIRST);
    expect(getStatus()).toHaveTextContent('');
    expect(screen.queryByTestId('analyticsHomeGenerationRegenerate')).not.toBeInTheDocument();
    expect(screen.queryByTestId('analyticsHomeGenerationShow')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['generation is unavailable', UNAVAILABLE_SOURCE_GENERATION],
    ['no generation is passed', undefined],
  ])('adds nothing to the panel when %s', (_, generation) => {
    setup(generation);

    expect(getQuestions()[0]).toBe(BUILT_IN_FIRST);
    expect(screen.queryByTestId('analyticsHomeGenerationStatus')).not.toBeInTheDocument();
  });

  it('ignores an answer written for another source', () => {
    setup(ready({ data: createGeneration({ source: 'other-events' }) }));

    expect(getQuestions()[0]).toBe(BUILT_IN_FIRST);
  });

  it('keeps the hand-written questions of sample data', () => {
    setup(UNAVAILABLE_SOURCE_GENERATION, {
      ...SAMPLE_EVENT_SOURCE,
      name: 'kibana_sample_data_clickstream',
      timeField: '@timestamp',
    });

    expect(getQuestions()[0]).toBe(
      'Where do sessions drop out between the first page and a purchase?'
    );
  });
});
