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

  it('shows the Discover ES|QL query as a pill in ask-anything', async () => {
    const user = userEvent.setup();
    const onChooseAgent = jest.fn();
    renderFlyout({
      onChooseAgent,
      discoverQuery: 'FROM logs-* | WHERE status >= 500',
    });

    expect(screen.getByTestId('mixedRulesDiscoverQueryPill')).toBeInTheDocument();
    expect(screen.getByText('ES|QL query')).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesOpenDiscoverQueryAsEsql')).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId('mixedRulesDiscoverQueryPill'));
    await user.click(screen.getByTestId('mixedRulesDiscoverQueryPillRemove'));
    expect(screen.queryByTestId('mixedRulesDiscoverQueryPill')).not.toBeInTheDocument();

    await user.type(
      screen.getByTestId('mixedRulesMeasureSearch'),
      'I want to create based on this prompt'
    );
    await user.click(screen.getByTestId('mixedRulesEnterAiModeButton'));
    expect(onChooseAgent).toHaveBeenCalledWith(
      'I want to create based on this prompt',
      undefined
    );
  });

  it('sends the Discover query with the agent when the pill is attached', async () => {
    const user = userEvent.setup();
    const onChooseAgent = jest.fn();
    renderFlyout({
      onChooseAgent,
      discoverQuery: 'FROM logs-* | WHERE status >= 500',
    });

    await user.type(
      screen.getByTestId('mixedRulesMeasureSearch'),
      'I want to create based on this prompt'
    );
    await user.click(screen.getByTestId('mixedRulesEnterAiModeButton'));
    expect(onChooseAgent).toHaveBeenCalledWith(
      'I want to create based on this prompt',
      'FROM logs-* | WHERE status >= 500'
    );
  });

  it('shows agent-first start screen with library examples, ES|QL, and Classic link', async () => {
    const user = userEvent.setup();
    const onChooseEsql = jest.fn();
    const onBrowseClassic = jest.fn();
    const onExploreLibrary = jest.fn();
    renderFlyout({ onChooseEsql, onBrowseClassic, onExploreLibrary });

    expect(screen.getByText('Create rule')).toBeInTheDocument();
    expect(screen.getByText('What do you want to measure?')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesAgentChatInput')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesMeasureSearch')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesMeasureSearch')).toHaveFocus();
    expect(screen.queryByTestId('mixedRulesMeasureSubmit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesModeToggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesMeasureSuggestions')).not.toBeInTheDocument();

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

  it('groups Universal builders, templates, then Classic — with ES|QL fallback when no builder matches', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'threshold');
    expect(await screen.findByTestId('mixedRulesSuggestionGroup-universal')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesPathSuggestion-threshold')).toBeInTheDocument();

    await user.clear(screen.getByTestId('mixedRulesMeasureSearch'));
    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'APM error');
    // No builder keyword hit → promote Write ES|QL under Universal.
    expect(await screen.findByTestId('mixedRulesSuggestionGroup-universal')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesPathSuggestion-esql')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesSuggestionGroup-classic')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesClassicSuggestion-apm.error_rate')).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesDomain-apm')).not.toBeInTheDocument();
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

  it('keeps suggestions open for Escape and submits free text to the agent on Enter', async () => {
    const user = userEvent.setup();
    const onChooseAgent = jest.fn();
    renderFlyout({ onChooseAgent });

    const search = screen.getByTestId('mixedRulesMeasureSearch');
    await user.type(search, 'APM error');
    expect(await screen.findByTestId('mixedRulesMeasureSuggestions')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesSuggestionGroup-classic')).toBeInTheDocument();
    expect(search).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(search, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(search).toHaveAttribute('aria-expanded', 'false');
    });

    await user.clear(search);
    await user.type(search, 'latency over 500ms');
    fireEvent.keyDown(search, { key: 'Enter', code: 'Enter' });
    expect(onChooseAgent).toHaveBeenCalledWith('latency over 500ms', undefined);
  });

  it('lists Universal (ES|QL fallback), all matching templates, then Classic — not domain buckets', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'CPU');

    expect(await screen.findByTestId('mixedRulesSuggestionGroup-universal')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesPathSuggestion-esql')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesSuggestionGroup-templates')).toBeInTheDocument();
    expect(
      screen.getByTestId('mixedRulesTemplateSuggestion-demo-high-cpu')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesDomain-infra')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesDomain-apm')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesDomain-slo')).not.toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesBrowseClassic')).toBeInTheDocument();
  });

  it('starts the AI agent from Send to Agent for descriptive natural language', async () => {
    const user = userEvent.setup();
    const onChooseAgent = jest.fn();
    renderFlyout({ onChooseAgent });

    expect(
      screen.getByPlaceholderText(
        'Pick a suggestion, or describe what you want and send to the agent.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesEnterAiMode')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesMeasureSubmit')).not.toBeInTheDocument();

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'I want to');

    expect(await screen.findByTestId('mixedRulesEnterAiMode')).toBeInTheDocument();
    expect(
      screen.getByText('Send this description to the agent to create the rule.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send to Agent' })).toBeInTheDocument();
    expect(screen.queryByText('No options available')).not.toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesMeasureSearch')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('mixedRulesMeasureSubmit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesPathSuggestion-esql')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesDomain-custom')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('mixedRulesEnterAiModeButton'));
    expect(onChooseAgent).toHaveBeenCalledWith('I want to', undefined);
  });

  it('hides the send control during normal keyword search', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'threshold');
    expect(await screen.findByTestId('mixedRulesPathSuggestion-threshold')).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesMeasureSubmit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesEnterAiMode')).not.toBeInTheDocument();
  });

  it('does not offer AI mode for short keyword search', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'CPU');
    expect(
      await screen.findByTestId('mixedRulesTemplateSuggestion-demo-high-cpu')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesEnterAiMode')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesMeasureSubmit')).not.toBeInTheDocument();
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
