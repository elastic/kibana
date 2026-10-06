/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
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

  it('shows Create paths, Rules on Rules, and routes APM to Classic', async () => {
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

    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.queryByText('Recommended')).not.toBeInTheDocument();
    expect(screen.queryByText('Advanced')).not.toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesChooseThreshold')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesChooseEsql')).toBeInTheDocument();
    expect(screen.queryByTestId('mixedRulesChooseAgent')).not.toBeInTheDocument();
    expect(screen.getByText('Rules on Rules')).toBeInTheDocument();
    expect(screen.getByTestId('mixedRulesChooseSequence')).toBeInTheDocument();

    await user.click(screen.getByTestId('mixedRulesDomain-custom'));
    expect(screen.getByTestId('mixedRulesChooseEsql')).toBeInTheDocument();
    await user.click(screen.getByTestId('mixedRulesChooseEsql'));
    expect(onChooseEsql).toHaveBeenCalled();

    await openMeasureSuggestions(user);
    await user.click(screen.getByTestId('mixedRulesDomain-apm'));
    expect(screen.getByTestId('mixedRulesContinueClassic')).toBeInTheDocument();
    expect(screen.queryByText('Create')).not.toBeInTheDocument();
    expect(screen.queryByText('Rules on Rules')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('mixedRulesContinueClassic'));
    expect(onBrowseClassic).toHaveBeenCalledWith('APM');
  });

  it('passes free-text measure query when continuing to Classic', async () => {
    const user = userEvent.setup();
    const onBrowseClassic = jest.fn();
    renderFlyout({ onBrowseClassic });

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'Anomaly');
    expect(screen.getByTestId('mixedRulesContinueClassic')).toBeInTheDocument();
    await user.click(screen.getByTestId('mixedRulesContinueClassic'));
    expect(onBrowseClassic).toHaveBeenCalledWith('Anomaly');
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
      screen.getByPlaceholderText('Describe the query you want in natural language')
    ).toBeInTheDocument();

    await user.type(screen.getByTestId('mixedRulesMeasureSearch'), 'latency over 500ms');
    await user.click(screen.getByTestId('mixedRulesMeasureSubmit'));
    expect(onChooseAgent).toHaveBeenCalledWith('latency over 500ms');

    await user.click(screen.getByTestId('mixedRulesAiMode'));
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
