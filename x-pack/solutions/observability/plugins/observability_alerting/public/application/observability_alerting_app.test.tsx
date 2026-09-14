/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedHistory } from '@kbn/core/public';
import type { AlertingV2PageProps } from '@kbn/alerting-v2-plugin/public';
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
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../constants';

const Placeholder = ({ name, privilegeCheck }: { name: string; privilegeCheck?: unknown }) => (
  <div data-test-subj={name} data-has-privilege-check={privilegeCheck != null}>
    {name}
  </div>
);

const mockAlertingVTwo = {
  RulesPage: (props: AlertingV2PageProps) => (
    <Placeholder name="rulesPage" privilegeCheck={props.privilegeCheck} />
  ),
  RuleLibraryPage: (props: AlertingV2PageProps) => (
    <Placeholder name="ruleLibraryPage" privilegeCheck={props.privilegeCheck} />
  ),
  EpisodesPage: (props: AlertingV2PageProps) => (
    <Placeholder name="episodesPage" privilegeCheck={props.privilegeCheck} />
  ),
  ActionPoliciesPage: (props: AlertingV2PageProps) => (
    <Placeholder name="actionPoliciesPage" privilegeCheck={props.privilegeCheck} />
  ),
  ExecutionHistoryPage: (props: AlertingV2PageProps) => (
    <Placeholder name="executionHistoryPage" privilegeCheck={props.privilegeCheck} />
  ),
  CreateRuleOptionsFlyout: () => null,
  createAlertingV2HostApp: jest.fn((appId: string, paths: Record<string, string>) => ({
    rules: { app: appId, basePath: paths.rules },
    ruleLibrary: { app: appId, basePath: paths.ruleLibrary },
    episodes: { app: appId, basePath: paths.episodes },
    actionPolicies: { app: appId, basePath: paths.actionPolicies },
    executionHistory: { app: appId, basePath: paths.executionHistory },
  })),
};

const createTestHistory = (pathname: string): ScopedHistory => {
  const history = createMemoryHistory({ initialEntries: [pathname] });
  return Object.assign(history, {
    createSubHistory: jest.fn(() => history),
  }) as unknown as ScopedHistory;
};

const mockTriggersActionsUi = {
  getClassicRulesPage: () => <Placeholder name="classicRulesPage" />,
};

const renderAt = (pathname: string) => {
  const coreStart = coreMock.createStart();
  const history = createTestHistory(pathname);

  const result = render(
    <Router history={history}>
      <ObservabilityAlertingApp
        coreStart={coreStart}
        alertingVTwo={mockAlertingVTwo}
        triggersActionsUi={mockTriggersActionsUi}
        history={history}
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

  it('renders the classic rules page at /rules/v1', async () => {
    const { getByTestId, history } = renderAt(OBSERVABILITY_ALERTING_RULES_V1_PATH);

    await waitFor(() => {
      expect(getByTestId('classicRulesPage')).toBeInTheDocument();
    });
    expect(history.createSubHistory).toHaveBeenCalledWith(OBSERVABILITY_ALERTING_RULES_V1_PATH);
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

  it.each([
    { path: OBSERVABILITY_ALERTING_INBOX_PATH, testId: 'episodesPage' },
    { path: OBSERVABILITY_ALERTING_RULES_V2_PATH, testId: 'rulesPage' },
    { path: OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH, testId: 'ruleLibraryPage' },
    { path: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH, testId: 'actionPoliciesPage' },
    { path: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH, testId: 'executionHistoryPage' },
  ])('passes privilegeCheck to $testId at $path', async ({ path, testId }) => {
    const { getByTestId } = renderAt(path);

    await waitFor(() => {
      expect(getByTestId(testId)).toBeInTheDocument();
    });
    expect(getByTestId(testId)).toHaveAttribute('data-has-privilege-check', 'true');
  });
});
