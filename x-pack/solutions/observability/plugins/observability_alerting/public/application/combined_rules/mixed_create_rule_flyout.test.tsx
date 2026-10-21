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

  const openMeasureSuggestions = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.clear(screen.getByTestId('mixedRulesMeasureSearch'));
    await user.click(screen.getByTestId('mixedRulesMeasureSearch'));
    await screen.findByTestId('mixedRulesDomain-infra');
  };

  it('shows Start with a builder and Build your own paths, and routes APM to Classic', async () => {
    const user = userEvent.setup();
    const onChooseEsql = jest.fn();
    const onBrowseClassic = jest.fn();
    renderFlyout({ onChooseEsql, onBrowseClassic });

    expect(screen.getByText('Create rule')).toBeInTheDocument();
    expect(screen.getByText('What do you want to measure?')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesMeasureSearch')).toBeInTheDocument();
    expect(screen.queryByText('Or start from a common intent')).not.toBeInTheDocument();

    await openMeasureSuggestions(user);
    expect(screen.getByTestId('mixedRulesDomain-infra')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesDomain-apm')).toBeInTheDocument();

    expect(screen.getByText('Start with a builder')).toBeInTheDocument();
    expect(screen.queryByText(/^Create$/)).not.toBeInTheDocument();
    expect(screen.queryByText('Advanced')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesSuggestedTemplates')).not.toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesChooseThreshold')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesChooseSequence')).toBeInTheDocument();
    // Sequence sits with builders (after Threshold), not under Build your own.
    const threshold = screen.getByTestId('mixedRulesChooseThreshold');
    const sequence = screen.getByTestId('mixedRulesChooseSequence');
    expect(
      Boolean(threshold.compareDocumentPosition(sequence) & Node.DOCUMENT_POSITION_FOLLOWING)
    ).toBe(true);
    expect(screen.getByTestId('mixedRulesChooseEsql')).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesChooseAgent')).not.toBeInTheDocument();
    expect(screen.getByText('Build your own')).toBeInTheDocument();

    await user.click(screen.getByTestId('mixedRulesDomain-infra'));
    expect(screen.getByText('Suggested builders')).toBeInTheDocument();
    expect(screen.queryByText('Start with a builder')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Create$/)).not.toBeInTheDocument();
    expect(screen.getByText('Build your own')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesChooseEsql')).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesChooseSequence')).not.toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesSuggestedTemplates')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesSuggestedTemplate-demo-high-cpu')).toBeInTheDocument();
    expect(
      screen.getByTestId('mixedRulesSuggestedTemplate-demo-memory-pressure')
    ).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesSuggestedTemplate-demo-disk-low')).toBeInTheDocument();

    await openMeasureSuggestions(user);
    await user.click(screen.getByTestId('mixedRulesDomain-custom'));
    expect(screen.queryByTestId('mixedRulesSuggestedTemplates')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesChooseSequence')).not.toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesChooseEsql')).toBeInTheDocument();
    await user.click(screen.getByTestId('mixedRulesChooseEsql'));
    expect(onChooseEsql).toHaveBeenCalled();

    await openMeasureSuggestions(user);
    expect(screen.getByText('CPU, memory, disk, network on hosts or containers')).toBeInTheDocument();
    expect(
      screen.getByText('Error rates, latency, throughput for services')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Error counts, patterns, or spikes in log data')
    ).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesDomain-ml')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesDomain-synthetics')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesDomain-slo')).toBeInTheDocument();

    await user.click(screen.getByTestId('mixedRulesDomain-apm'));
    expect(screen.getByTestId('mixedRulesMeasureSearch')).toHaveValue('APM');
    expect(screen.queryByTestId('mixedRulesSuggestedTemplates')).not.toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesContinueClassic')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesContinueClassic-suggestions')).toBeInTheDocument();
    expect(
      screen.getByTestId('mixedRulesContinueClassic-suggestion-apm.error_rate')
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Create$/)).not.toBeInTheDocument();
    expect(screen.queryByText('Build your own')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('mixedRulesContinueClassic-browseAll'));
    expect(onBrowseClassic).toHaveBeenCalledWith('APM');
  });

  it('selects a Classic rule type suggestion from the continue card', async () => {
    const user = userEvent.setup();
    const onSelectClassicRuleType = jest.fn();
    renderFlyout({ onSelectClassicRuleType });

    await openMeasureSuggestions(user);
    await user.click(screen.getByTestId('mixedRulesDomain-apm'));
    await user.click(screen.getByTestId('mixedRulesContinueClassic-suggestion-apm.error_rate'));
    expect(onSelectClassicRuleType).toHaveBeenCalledWith('apm.error_rate');
  });

  it('routes Machine Learning free text to Classic separately from APM', async () => {
    const user = userEvent.setup();
    const onBrowseClassic = jest.fn();
    renderFlyout({ onBrowseClassic });

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'Anomaly');
    expect(screen.getByTestId('mixedRulesContinueClassic')).toBeInTheDocument();
    expect(
      screen.getByText('Anomaly detection and ML rules are only supported in Classic alerting.')
    ).toBeInTheDocument();
    await user.click(screen.getByTestId('mixedRulesContinueClassic-browseAll'));
    expect(onBrowseClassic).toHaveBeenCalledWith('Anomaly');

    await user.clear(screen.getByTestId('mixedRulesMeasureSearch'));
    await openMeasureSuggestions(user);
    await user.click(screen.getByTestId('mixedRulesDomain-ml'));
    expect(screen.getByTestId('mixedRulesMeasureSearch')).toHaveValue('Anomaly');
    expect(screen.getByTestId('mixedRulesContinueClassic')).toBeInTheDocument();
  });

  it('closes suggestions on Enter so free-text results are visible', async () => {
    const user = userEvent.setup();
    renderFlyout();

    const search = screen.getByTestId('mixedRulesMeasureSearch');
    await user.type(search, 'Anomaly');
    expect(await screen.findByTestId('mixedRulesMeasureSuggestions')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesDomain-ml')).toBeInTheDocument();
    expect(search).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(search, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(search).toHaveAttribute('aria-expanded', 'false');
    });
    expect(screen.getByTestId('mixedRulesContinueClassic')).toBeInTheDocument();
  });

  it('filters domain suggestions by the typed query', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'SLO');

    expect(await screen.findByTestId('mixedRulesDomain-slo')).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesDomain-infra')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesDomain-apm')).not.toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesContinueClassic')).toBeInTheDocument();
  });

  it('starts the AI agent from AI mode search submit with user input', async () => {
    const user = userEvent.setup();
    const onChooseAgent = jest.fn();
    renderFlyout({ onChooseAgent });

    expect(screen.getByTestId('mixedRulesAiMode')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('mixedRulesMeasureSubmit')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('mixedRulesAiMode'));
    expect(screen.getByTestId('mixedRulesAiMode')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('mixedRulesMeasureSubmit')).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesMeasureSuggestions')).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Describe the rule you want in natural language')
    ).toBeInTheDocument();

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'latency over 500ms');
    await user.click(screen.getByTestId('mixedRulesMeasureSubmit'));
    expect(onChooseAgent).toHaveBeenCalledWith('latency over 500ms');

    await user.click(screen.getByTestId('mixedRulesSearchMode'));
    expect(screen.getByTestId('mixedRulesAiMode')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('mixedRulesMeasureSubmit')).not.toBeInTheDocument();
    await openMeasureSuggestions(user);
    expect(await screen.findByTestId('mixedRulesDomain-infra')).toBeInTheDocument();
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
