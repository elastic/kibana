/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { ObservabilityAlertingApp } from './observability_alerting_app';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_INBOX_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../constants';

const Placeholder = ({ name }: { name: string }) => <div data-test-subj={name}>{name}</div>;

const mockAlertingVTwo = {
  RulesPage: () => <Placeholder name="rulesPage" />,
  RuleLibraryPage: () => <Placeholder name="ruleLibraryPage" />,
  EpisodesPage: () => <Placeholder name="episodesPage" />,
  ActionPoliciesPage: () => <Placeholder name="actionPoliciesPage" />,
  ExecutionHistoryPage: () => <Placeholder name="executionHistoryPage" />,
  CreateRuleOptionsFlyout: () => null,
};

const renderAt = (pathname: string) => {
  const coreStart = coreMock.createStart();
  const history = createMemoryHistory({ initialEntries: [pathname] });

  const result = render(
    <Router history={history}>
      <ObservabilityAlertingApp
        coreStart={coreStart}
        alertingVTwo={mockAlertingVTwo}
        setBreadcrumbs={jest.fn()}
      />
    </Router>
  );

  return { ...result, coreStart, history };
};

describe('ObservabilityAlertingApp', () => {
  it('redirects / to inbox', () => {
    const { history } = renderAt('/');

    expect(history.location.pathname).toBe(OBSERVABILITY_ALERTING_INBOX_PATH);
  });

  it('renders EpisodesPage at /inbox', async () => {
    const { getByTestId } = renderAt(OBSERVABILITY_ALERTING_INBOX_PATH);

    await waitFor(() => {
      expect(getByTestId('episodesPage')).toBeInTheDocument();
    });
  });

  it('renders RulesPage at /rules/v2', async () => {
    const { getByTestId } = renderAt(OBSERVABILITY_ALERTING_RULES_V2_PATH);

    await waitFor(() => {
      expect(getByTestId('rulesPage')).toBeInTheDocument();
    });
  });

  it('renders RuleLibraryPage at /rule-library', async () => {
    const { getByTestId } = renderAt(OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH);

    await waitFor(() => {
      expect(getByTestId('ruleLibraryPage')).toBeInTheDocument();
    });
  });

  it('renders ActionPoliciesPage at /action-policies', async () => {
    const { getByTestId } = renderAt(OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH);

    await waitFor(() => {
      expect(getByTestId('actionPoliciesPage')).toBeInTheDocument();
    });
  });

  it('renders ExecutionHistoryPage at /execution-history', async () => {
    const { getByTestId } = renderAt(OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH);

    await waitFor(() => {
      expect(getByTestId('executionHistoryPage')).toBeInTheDocument();
    });
  });

  it('redirects unknown paths to inbox', () => {
    const { history } = renderAt('/unknown');

    expect(history.location.pathname).toBe(OBSERVABILITY_ALERTING_INBOX_PATH);
  });
});
