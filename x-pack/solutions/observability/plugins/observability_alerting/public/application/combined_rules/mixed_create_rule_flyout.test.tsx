/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
import {
  MixedClassicRuleTypesFlyout,
  MixedCreateRuleFlyout,
} from './mixed_create_rule_flyout';

const TestProviders = ({ children }: { children: React.ReactNode }) => (
  <EuiProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiProvider>
);

jest.mock('@kbn/alerts-ui-shared', () => ({
  useGetRuleTypesPermissions: () => ({
    ruleTypesState: {
      data: new Map([
        [
          '.es-query',
          { id: '.es-query', name: 'Elasticsearch query', producer: 'stackAlerts' },
        ],
        ['apm.error_rate', { id: 'apm.error_rate', name: 'APM error count', producer: 'apm' }],
      ]),
      isLoading: false,
    },
  }),
}));

jest.mock('@kbn/response-ops-rules-apis/hooks/use_find_templates_query', () => ({
  useFindTemplatesQuery: () => ({
    templates: [
      {
        id: 'tpl-1',
        name: 'ES query template',
        tags: ['logs'],
        ruleTypeId: '.es-query',
      },
    ],
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isLoading: false,
    isFetchingNextPage: false,
  }),
}));

describe('MixedCreateRuleFlyout', () => {
  const renderFlyout = (
    overrides: Partial<React.ComponentProps<typeof MixedCreateRuleFlyout>> = {}
  ) => {
    const coreStart = coreMock.createStart();
    return render(
      <TestProviders>
        <MixedCreateRuleFlyout
          onClose={jest.fn()}
          onChooseThreshold={jest.fn()}
          onChooseEsql={jest.fn()}
          onChooseAgent={jest.fn()}
          onChooseSequence={jest.fn()}
          onBrowseClassic={jest.fn()}
          onExploreLibrary={jest.fn()}
          onSelectClassicRuleType={jest.fn()}
          showClassic={true}
          http={coreStart.http}
          toasts={coreStart.notifications.toasts}
          registeredRuleTypes={[]}
          historyKey={Symbol('test')}
          {...overrides}
        />
      </TestProviders>
    );
  };

  it('shows agent-first start screen with library examples, ES|QL, and Classic link', async () => {
    const user = userEvent.setup();
    const onChooseEsql = jest.fn();
    const onBrowseClassic = jest.fn();
    const onExploreLibrary = jest.fn();
    renderFlyout({ onChooseEsql, onBrowseClassic, onExploreLibrary });

    expect(screen.getByText('Create rule')).toBeInTheDocument();
    expect(screen.getByText('What do you want to measure?')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesMeasureSearch')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesMeasureSearch')).toHaveFocus();
    expect(screen.queryByTestId('mixedRulesMeasureSubmit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesModeToggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesMeasureSuggestions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesEnterAiModeButton')).not.toBeInTheDocument();

    expect(screen.getByText('Start from a template')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesSuggestedTemplates')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesSuggestedTemplates')).toHaveAttribute(
      'data-maximized',
      'false'
    );
    expect(screen.getByTestId('mixedRulesSuggestedTemplate-demo-high-cpu')).toBeInTheDocument();
    expect(
      screen.getByTestId('mixedRulesSuggestedTemplate-demo-memory-pressure')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('mixedRulesSuggestedTemplate-demo-error-log-spike')
    ).toBeInTheDocument();

    expect(screen.queryByText('Guided builders')).not.toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesHelpMeBuild')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesChooseThreshold')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesChooseSequence')).toBeInTheDocument();

    expect(screen.getByTestId('mixedRulesChooseEsql')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesClassicFooter')).toBeInTheDocument();
    expect(screen.getByText('Looking for Classic rule types?')).toBeInTheDocument();
    expect(screen.getByText('Browse all')).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesContinueClassic')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('mixedRulesChooseEsql'));
    expect(onChooseEsql).toHaveBeenCalled();

    await user.click(screen.getByTestId('mixedRulesExploreLibrary'));
    expect(onExploreLibrary).toHaveBeenCalled();

    await user.click(screen.getByTestId('mixedRulesBrowseClassic'));
    expect(onBrowseClassic).toHaveBeenCalled();
  });

  it('hides the Classic idle footer when the prototype setting is off', () => {
    renderFlyout({ showClassicIdleFooter: false });

    expect(screen.queryByTestId('mixedRulesClassicFooter')).not.toBeInTheDocument();
    expect(screen.queryByText('Looking for Classic rule types?')).not.toBeInTheDocument();
  });

  it('does not open suggestions on focus until the user starts typing', async () => {
    const user = userEvent.setup();
    renderFlyout();

    const search = screen.getByTestId('mixedRulesMeasureSearch');
    expect(search).toHaveFocus();
    expect(screen.queryByTestId('mixedRulesMeasureSuggestions')).not.toBeInTheDocument();

    await user.click(search);
    expect(screen.queryByTestId('mixedRulesMeasureSuggestions')).not.toBeInTheDocument();

    await user.type(search, 'threshold');
    expect(await screen.findByTestId('mixedRulesMeasureSuggestions')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesSuggestionGroup-universal')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesPathSuggestion-threshold')).toBeInTheDocument();
  });

  it('keeps builders, templates, and Classic footer stable while searching', async () => {
    const user = userEvent.setup();
    const onBrowseClassic = jest.fn();
    renderFlyout({ onBrowseClassic });

    expect(screen.getByTestId('mixedRulesHelpMeBuild')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesSuggestedTemplates')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesSuggestedTemplate-demo-high-cpu')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesBrowseClassic')).toBeInTheDocument();

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'APM error');
    expect(await screen.findByTestId('mixedRulesClassicSuggestion-apm.error_rate')).toBeInTheDocument();

    // Body stays the same — search only drives the typeahead.
    expect(screen.getByTestId('mixedRulesHelpMeBuild')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesSuggestedTemplates')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesSuggestedTemplate-demo-high-cpu')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesChooseEsql')).toBeInTheDocument();
    expect(screen.queryByText('APM rules are only supported in Classic alerting.')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('mixedRulesBrowseClassic'));
    expect(onBrowseClassic).toHaveBeenCalledWith('APM error');
  });

  it('filters Universal builders, templates, and Classic by the search query', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'threshold');
    expect(await screen.findByTestId('mixedRulesSuggestionGroup-universal')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesPathSuggestion-threshold')).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesPathSuggestion-sequence')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesPathSuggestion-esql')).not.toBeInTheDocument();

    await user.clear(screen.getByTestId('mixedRulesMeasureSearch'));
    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'APM error');
    expect(await screen.findByTestId('mixedRulesSuggestionGroup-classic')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesClassicSuggestion-apm.error_rate')).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesSuggestionGroup-universal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesDomain-apm')).not.toBeInTheDocument();
  });

  it('shows a no-results state with the agent footer when nothing matches', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'When there is no result');
    expect(await screen.findByTestId('mixedRulesNoSuggestions')).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesSuggestionGroup-universal')).not.toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesEnterAiMode')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesEnterAiModeButton')).toBeInTheDocument();
  });

  it('starts a guided builder from ask-anything path suggestions', async () => {
    const user = userEvent.setup();
    const onChooseThreshold = jest.fn();
    renderFlyout({ onChooseThreshold });

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'threshold');
    await user.click(await screen.findByTestId('mixedRulesPathSuggestion-threshold'));
    expect(onChooseThreshold).toHaveBeenCalled();
  });

  it('selects a Classic rule type from ask-anything suggestions', async () => {
    const user = userEvent.setup();
    const onSelectClassicRuleType = jest.fn();
    renderFlyout({ onSelectClassicRuleType });

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'APM error');
    await user.click(
      await screen.findByTestId('mixedRulesClassicSuggestion-apm.error_rate')
    );
    expect(onSelectClassicRuleType).toHaveBeenCalledWith('apm.error_rate');
  });

  it('opens Classic browse from the Classic group Browse all link', async () => {
    const user = userEvent.setup();
    const onBrowseClassic = jest.fn();
    renderFlyout({ onBrowseClassic });

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'APM error');
    expect(await screen.findByTestId('mixedRulesSuggestionGroup-classic')).toBeInTheDocument();
    const search = screen.getByTestId('mixedRulesMeasureSearch');
    expect(search).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByTestId('mixedRulesBrowseClassicFromSuggestions'));
    expect(onBrowseClassic).toHaveBeenCalledWith('APM error');
    await waitFor(() => {
      expect(search).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('closes suggestions on Escape and does not send to the agent on Enter', async () => {
    const user = userEvent.setup();
    const onChooseAgent = jest.fn();
    renderFlyout({ onChooseAgent });

    const search = screen.getByTestId('mixedRulesMeasureSearch');
    await user.type(search, 'APM error');
    expect(await screen.findByTestId('mixedRulesMeasureSuggestions')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesSuggestionGroup-classic')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesEnterAiMode')).toBeInTheDocument();
    expect(search).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(search, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(search).toHaveAttribute('aria-expanded', 'false');
    });

    await user.clear(search);
    await user.type(search, 'latency over 500ms');
    fireEvent.keyDown(search, { key: 'Enter', code: 'Enter' });
    expect(onChooseAgent).not.toHaveBeenCalled();
  });

  it('lists matching templates and the agent footer — not domain buckets', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'CPU');

    expect(await screen.findByTestId('mixedRulesSuggestionGroup-templates')).toBeInTheDocument();
    expect(screen.getByText('From templates')).toBeInTheDocument();
    expect(
      screen.getByTestId('mixedRulesTemplateSuggestion-demo-high-cpu')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesSuggestionGroup-universal')).not.toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesEnterAiMode')).toBeInTheDocument();
    expect(screen.getByText('Build this rule with the agent')).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesDomain-infra')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesDomain-apm')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesDomain-slo')).not.toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesBrowseClassic')).toBeInTheDocument();
  });

  it('embeds Send to Agent as a footer action under search results', async () => {
    const user = userEvent.setup();
    const onChooseAgent = jest.fn();
    renderFlyout({ onChooseAgent });

    expect(
      screen.getByPlaceholderText('Search builder, templates or describe a rule')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesEnterAiModeButton')).not.toBeInTheDocument();

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'threshold');
    expect(await screen.findByTestId('mixedRulesPathSuggestion-threshold')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesEnterAiMode')).toBeInTheDocument();
    expect(screen.getByText('Build this rule with the agent')).toBeInTheDocument();

    await user.click(screen.getByTestId('mixedRulesEnterAiModeButton'));
    expect(onChooseAgent).toHaveBeenCalledWith('threshold', undefined);
  });
});

describe('MixedClassicRuleTypesFlyout', () => {
  it('prefills search from initialSearch and filters the list', async () => {
    const coreStart = coreMock.createStart();

    render(
      <TestProviders>
        <MixedClassicRuleTypesFlyout
          onClose={jest.fn()}
          onSelectClassicRuleType={jest.fn()}
          onSelectTemplate={jest.fn()}
          http={coreStart.http}
          toasts={coreStart.notifications.toasts}
          registeredRuleTypes={[]}
          historyKey={Symbol('classic')}
          initialSearch="Anomaly"
        />
      </TestProviders>
    );

    expect(screen.getByTestId('mixedRulesClassicSearch')).toHaveValue('Anomaly');
  });

  it('lists classic types without leading icons', async () => {
    const user = userEvent.setup();
    const coreStart = coreMock.createStart();
    const onSelectClassicRuleType = jest.fn();
    const onSelectTemplate = jest.fn();

    render(
      <TestProviders>
        <MixedClassicRuleTypesFlyout
          onClose={jest.fn()}
          onSelectClassicRuleType={onSelectClassicRuleType}
          onSelectTemplate={onSelectTemplate}
          http={coreStart.http}
          toasts={coreStart.notifications.toasts}
          registeredRuleTypes={[]}
          historyKey={Symbol('classic')}
        />
      </TestProviders>
    );

    expect(screen.getByText('Classic rule types')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesClassicSearch')).toBeInTheDocument();
    expect(screen.getByText('APM error count')).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesClassicBack')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('apm.error_rate-SelectOption'));
    expect(onSelectClassicRuleType).toHaveBeenCalledWith('apm.error_rate');

    await user.click(screen.getByRole('button', { name: 'Template' }));
    expect(screen.getByText('ES query template')).toBeInTheDocument();
    await user.click(screen.getByTestId('tpl-1-SelectOption'));
    expect(onSelectTemplate).toHaveBeenCalledWith('tpl-1');
  });
});
