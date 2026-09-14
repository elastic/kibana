/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedHistory } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import type { AlertingV2PageProps } from '@kbn/alerting-v2-plugin/public';
import type { ClassicRulesPageProps } from '@kbn/triggers-actions-ui-plugin/public';
import { OBSERVABILITY_ALERTING_APP_ID } from '@kbn/deeplinks-observability';
import { ObservabilityAlertingApp } from './observability_alerting_app';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_BASE_PATH,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_INBOX_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../constants';

const Placeholder = ({ name }: { name: string }) => <div data-test-subj={name}>{name}</div>;

const HostTabs = ({ tabs }: { tabs?: AlertingV2PageProps['tabs'] }) => (
  <>
    {tabs?.map((tab) => (
      <button
        key={tab.id}
        type="button"
        role="tab"
        data-test-subj={tab['data-test-subj']}
        data-href={tab.href}
        aria-selected={tab.isSelected}
      >
        {tab.label}
      </button>
    ))}
  </>
);

const mockAlertingVTwo = {
  RulesPage: ({ hostApp, tabs }: AlertingV2PageProps) => (
    <>
      <Placeholder name={`rulesPage:${hostApp?.rules?.app ?? 'none'}`} />
      <HostTabs tabs={tabs} />
    </>
  ),
  RuleLibraryPage: ({ hostApp }: AlertingV2PageProps) => (
    <Placeholder name={`ruleLibraryPage:${hostApp?.ruleLibrary?.app ?? 'none'}`} />
  ),
  EpisodesPage: ({ hostApp }: AlertingV2PageProps) => (
    <Placeholder name={`episodesPage:${hostApp?.episodes?.app ?? 'none'}`} />
  ),
  ActionPoliciesPage: ({ hostApp }: AlertingV2PageProps) => (
    <Placeholder name={`actionPoliciesPage:${hostApp?.actionPolicies?.app ?? 'none'}`} />
  ),
  ExecutionHistoryPage: ({ hostApp }: AlertingV2PageProps) => (
    <Placeholder name={`executionHistoryPage:${hostApp?.executionHistory?.app ?? 'none'}`} />
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
  getClassicRulesPage: ({ tabs }: ClassicRulesPageProps) => (
    <>
      <Placeholder name="classicRulesPage" />
      <HostTabs tabs={tabs} />
    </>
  ),
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

  it('renders EpisodesPage at /inbox with observability host', async () => {
    const { getByTestId } = renderAt(OBSERVABILITY_ALERTING_INBOX_PATH);

    await waitFor(() => {
      expect(getByTestId(`episodesPage:${OBSERVABILITY_ALERTING_APP_ID}`)).toBeInTheDocument();
    });
  });

  it('renders the classic rules page at /rules/v1', async () => {
    const { getByTestId, history } = renderAt(OBSERVABILITY_ALERTING_RULES_V1_PATH);

    await waitFor(() => {
      expect(getByTestId('classicRulesPage')).toBeInTheDocument();
    });
    expect(history.createSubHistory).toHaveBeenCalledWith(OBSERVABILITY_ALERTING_RULES_V1_PATH);
  });

  it('passes observability v1/v2 tab hrefs to the classic rules page', async () => {
    const { getByTestId, coreStart } = renderAt(OBSERVABILITY_ALERTING_RULES_V1_PATH);
    const prepend = coreStart.http.basePath.prepend;

    await waitFor(() => {
      expect(getByTestId('classicRulesPage')).toBeInTheDocument();
    });
    expect(getByTestId('v1RulesTab')).toHaveAttribute(
      'data-href',
      prepend(`${OBSERVABILITY_ALERTING_BASE_PATH}${OBSERVABILITY_ALERTING_RULES_V1_PATH}`)
    );
    expect(getByTestId('v2RulesTab')).toHaveAttribute(
      'data-href',
      prepend(`${OBSERVABILITY_ALERTING_BASE_PATH}${OBSERVABILITY_ALERTING_RULES_V2_PATH}`)
    );
    expect(getByTestId('v1RulesTab')).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId('v2RulesTab')).toHaveAttribute('aria-selected', 'false');
  });

  it('renders RulesPage at /rules/v2 with observability host', async () => {
    const { getByTestId } = renderAt(OBSERVABILITY_ALERTING_RULES_V2_PATH);

    await waitFor(() => {
      expect(getByTestId(`rulesPage:${OBSERVABILITY_ALERTING_APP_ID}`)).toBeInTheDocument();
    });
  });

  it('passes observability v1/v2 tab hrefs to the v2 rules page', async () => {
    const { getByTestId, coreStart } = renderAt(OBSERVABILITY_ALERTING_RULES_V2_PATH);
    const prepend = coreStart.http.basePath.prepend;

    await waitFor(() => {
      expect(getByTestId(`rulesPage:${OBSERVABILITY_ALERTING_APP_ID}`)).toBeInTheDocument();
    });
    expect(getByTestId('v1RulesTab')).toHaveAttribute(
      'data-href',
      prepend(`${OBSERVABILITY_ALERTING_BASE_PATH}${OBSERVABILITY_ALERTING_RULES_V1_PATH}`)
    );
    expect(getByTestId('v2RulesTab')).toHaveAttribute(
      'data-href',
      prepend(`${OBSERVABILITY_ALERTING_BASE_PATH}${OBSERVABILITY_ALERTING_RULES_V2_PATH}`)
    );
    expect(getByTestId('v2RulesTab')).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId('v1RulesTab')).toHaveAttribute('aria-selected', 'false');
  });

  it('renders RuleLibraryPage at /rule-library with observability host', async () => {
    const { getByTestId } = renderAt(OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH);

    await waitFor(() => {
      expect(getByTestId(`ruleLibraryPage:${OBSERVABILITY_ALERTING_APP_ID}`)).toBeInTheDocument();
    });
  });

  it('renders ActionPoliciesPage at /action-policies with observability host', async () => {
    const { getByTestId } = renderAt(OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH);

    await waitFor(() => {
      expect(
        getByTestId(`actionPoliciesPage:${OBSERVABILITY_ALERTING_APP_ID}`)
      ).toBeInTheDocument();
    });
  });

  it('renders ExecutionHistoryPage at /execution-history with observability host', async () => {
    const { getByTestId } = renderAt(OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH);

    await waitFor(() => {
      expect(
        getByTestId(`executionHistoryPage:${OBSERVABILITY_ALERTING_APP_ID}`)
      ).toBeInTheDocument();
    });
  });

  it('redirects unknown paths to inbox', () => {
    const { history } = renderAt('/unknown');

    expect(history.location.pathname).toBe(OBSERVABILITY_ALERTING_INBOX_PATH);
  });
});
