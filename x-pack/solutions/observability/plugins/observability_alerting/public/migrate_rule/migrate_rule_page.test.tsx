/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { Route, Router } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { httpServiceMock } from '@kbn/core/public/mocks';
import type { CreateRuleFlyoutProps } from '@kbn/alerting-v2-plugin/public';
import { MigrateRulePage } from './migrate_rule_page';

const originalRuleResponse = {
  id: 'rule-1',
  name: 'High error rate',
  tags: ['production'],
  enabled: true,
  rule_type_id: '.es-query',
  schedule: { interval: '1m' },
  params: {
    searchType: 'esqlQuery',
    esqlQuery: { esql: 'FROM logs-* | WHERE log.level == "error"' },
    timeField: '@timestamp',
    timeWindowSize: 5,
    timeWindowUnit: 'm',
  },
  alert_delay: { active: 3 },
  actions: [],
  outcome: 'exactMatch',
};

const http = httpServiceMock.createStartContract();

const CreateRuleFlyout = jest.fn(({ flyoutType, onClose }: CreateRuleFlyoutProps) => (
  <div data-test-subj="createRuleFlyout" data-flyout-type={flyoutType}>
    <button type="button" data-test-subj="createRuleFlyoutClose" onClick={onClose} />
  </div>
));

const migrateRule = jest.fn(async () => undefined);
const createMigratedRule = jest.fn(async () => 'v2-rule-1');
const createMigratedActionPolicies = jest.fn(async () => []);
const isMigratedActionPolicyReady = jest.fn(() => true);

const renderPage = () => {
  const setBreadcrumbs = jest.fn();
  const onRuleCreated = jest.fn();
  const history = createMemoryHistory({ initialEntries: ['/rules/migrate/rule-1'] });

  render(
    <I18nProvider>
      <Router history={history}>
        <Route path="/rules/migrate/:ruleId">
          <MigrateRulePage
            http={http}
            setBreadcrumbs={setBreadcrumbs}
            CreateRuleFlyout={CreateRuleFlyout}
            migrateRule={migrateRule}
            createMigratedRule={createMigratedRule}
            createMigratedActionPolicies={createMigratedActionPolicies}
            isMigratedActionPolicyReady={isMigratedActionPolicyReady}
            onRuleCreated={onRuleCreated}
          />
        </Route>
      </Router>
    </I18nProvider>
  );

  return { setBreadcrumbs, onRuleCreated };
};

describe('MigrateRulePage', () => {
  beforeEach(() => {
    http.get.mockReset();
    CreateRuleFlyout.mockClear();
  });

  it('shows the original rule beside a push create-rule flyout', async () => {
    http.get.mockResolvedValue(originalRuleResponse);
    const { onRuleCreated } = renderPage();

    expect(await screen.findByTestId('migrateRuleOriginalRuleName')).toHaveTextContent(
      'High error rate'
    );
    expect(http.get).toHaveBeenCalledWith('/internal/alerting/rule/rule-1/_resolve');
    expect(screen.getByTestId('migrateRulePage')).toHaveAttribute('data-rule-id', 'rule-1');
    expect(screen.getByTestId('migrateRuleOriginalRuleQuery')).toHaveTextContent(
      'FROM logs-* | WHERE log.level == "error"'
    );

    const details = screen.getByTestId('migrateRuleOriginalRuleDetails');
    expect(details).toHaveTextContent('1m');
    expect(details).toHaveTextContent('5m');
    expect(details).toHaveTextContent('@timestamp');
    expect(details).toHaveTextContent('3 consecutive matches');

    expect(screen.getByTestId('createRuleFlyout')).toHaveAttribute('data-flyout-type', 'push');
    expect(CreateRuleFlyout.mock.calls.at(-1)?.[0].onRuleCreated).toBe(onRuleCreated);
  });

  it('reopens the create-rule flyout after it is closed', async () => {
    http.get.mockResolvedValue(originalRuleResponse);
    renderPage();
    await screen.findByTestId('migrateRuleOriginalRuleName');

    expect(screen.queryByTestId('migrateRuleOpenNewRuleFlyout')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('createRuleFlyoutClose'));
    expect(screen.queryByTestId('createRuleFlyout')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('migrateRuleOpenNewRuleFlyout'));
    expect(screen.getByTestId('createRuleFlyout')).toBeInTheDocument();
    expect(screen.queryByTestId('migrateRuleOpenNewRuleFlyout')).not.toBeInTheDocument();
  });

  it('shows an error when the original rule cannot be loaded', async () => {
    http.get.mockRejectedValue(new Error('Not Found'));
    renderPage();

    expect(await screen.findByTestId('migrateRuleOriginalRuleError')).toHaveTextContent(
      'Not Found'
    );
    expect(screen.getByTestId('createRuleFlyout')).toBeInTheDocument();
  });

  it('sets breadcrumbs back to the classic rules list', () => {
    http.get.mockReturnValue(new Promise(() => {}));
    const { setBreadcrumbs } = renderPage();

    expect(screen.getByTestId('migrateRuleOriginalRuleLoading')).toBeInTheDocument();

    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Alerting' },
      { text: 'Rules', href: '/rules/classic' },
      { text: 'Migrate rule' },
    ]);
  });
});
