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
import type { ClassicRulesPageProps } from '@kbn/triggers-actions-ui-plugin/public';
import { SEARCH_ALERTING_APP_ID } from '@kbn/deeplinks-search';
import { SearchAlertingApp } from './search_alerting_app';
import {
  SEARCH_ALERTING_ACTION_POLICIES_PATH,
  SEARCH_ALERTING_BASE_PATH,
  SEARCH_ALERTING_EXECUTION_HISTORY_PATH,
  SEARCH_ALERTING_INBOX_PATH,
  SEARCH_ALERTING_RULE_LIBRARY_PATH,
  SEARCH_ALERTING_RULES_V1_PATH,
  SEARCH_ALERTING_RULES_V2_PATH,
} from '../constants';

const Placeholder = ({ name, privilegeCheck }: { name: string; privilegeCheck?: unknown }) => (
  <div data-test-subj={name} data-has-privilege-check={privilegeCheck != null}>
    {name}
  </div>
);

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
  RulesPage: ({ hostApp, tabs, privilegeCheck }: AlertingV2PageProps) => (
    <>
      <Placeholder
        name={`rulesPage:${hostApp?.rules?.app ?? 'none'}`}
        privilegeCheck={privilegeCheck}
      />
      <HostTabs tabs={tabs} />
    </>
  ),
  RuleLibraryPage: ({ hostApp, privilegeCheck }: AlertingV2PageProps) => (
    <Placeholder
      name={`ruleLibraryPage:${hostApp?.ruleLibrary?.app ?? 'none'}`}
      privilegeCheck={privilegeCheck}
    />
  ),
  EpisodesPage: ({ hostApp, privilegeCheck }: AlertingV2PageProps) => (
    <Placeholder
      name={`episodesPage:${hostApp?.episodes?.app ?? 'none'}`}
      privilegeCheck={privilegeCheck}
    />
  ),
  ActionPoliciesPage: ({ hostApp, privilegeCheck }: AlertingV2PageProps) => (
    <Placeholder
      name={`actionPoliciesPage:${hostApp?.actionPolicies?.app ?? 'none'}`}
      privilegeCheck={privilegeCheck}
    />
  ),
  ExecutionHistoryPage: ({ hostApp, privilegeCheck }: AlertingV2PageProps) => (
    <Placeholder
      name={`executionHistoryPage:${hostApp?.executionHistory?.app ?? 'none'}`}
      privilegeCheck={privilegeCheck}
    />
  ),
  CreateRuleOptionsFlyout: () => null,
  createAlertingV2HostApp: jest.fn((appId: string, paths: Record<string, string>) => ({
    rules: { app: appId, pathPrefix: paths.rules },
    ruleLibrary: { app: appId, pathPrefix: paths.ruleLibrary },
    episodes: { app: appId, pathPrefix: paths.episodes },
    actionPolicies: { app: appId, pathPrefix: paths.actionPolicies },
    executionHistory: { app: appId, pathPrefix: paths.executionHistory },
  })),
};

const createTestHistory = (pathname: string): ScopedHistory => {
  const history = createMemoryHistory({ initialEntries: [pathname] });
  return Object.assign(history, {
    createSubHistory: jest.fn(() => history),
  }) as unknown as ScopedHistory;
};

const mockTriggersActionsUi = {
  getClassicRulesPage: jest.fn(({ tabs }: ClassicRulesPageProps) => (
    <>
      <Placeholder name="classicRulesPage" />
      <HostTabs tabs={tabs} />
    </>
  )),
};

const renderAt = (pathname: string) => {
  const coreStart = coreMock.createStart();
  const history = createTestHistory(pathname);

  const result = render(
    <Router history={history}>
      <SearchAlertingApp
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

describe('SearchAlertingApp', () => {
  beforeEach(() => {
    mockTriggersActionsUi.getClassicRulesPage.mockClear();
  });

  it('redirects / to inbox', () => {
    const { history } = renderAt('/');

    expect(history.location.pathname).toBe(SEARCH_ALERTING_INBOX_PATH);
  });

  it('renders EpisodesPage at /inbox with search host', async () => {
    const { getByTestId } = renderAt(SEARCH_ALERTING_INBOX_PATH);

    await waitFor(() => {
      expect(getByTestId(`episodesPage:${SEARCH_ALERTING_APP_ID}`)).toBeInTheDocument();
    });
  });

  it('renders the classic rules page at /rules/v1', async () => {
    const { getByTestId, history } = renderAt(SEARCH_ALERTING_RULES_V1_PATH);

    await waitFor(() => {
      expect(getByTestId('classicRulesPage')).toBeInTheDocument();
    });
    expect(history.createSubHistory).toHaveBeenCalledWith(SEARCH_ALERTING_RULES_V1_PATH);
    expect(mockTriggersActionsUi.getClassicRulesPage).toHaveBeenCalledWith(
      expect.objectContaining({
        hideListBackButton: true,
        history,
        host: {
          app: SEARCH_ALERTING_APP_ID,
          pathPrefix: SEARCH_ALERTING_RULES_V1_PATH,
        },
      })
    );
  });

  it('passes search v1/v2 tab hrefs to the classic rules page', async () => {
    const { getByTestId, coreStart } = renderAt(SEARCH_ALERTING_RULES_V1_PATH);
    const prepend = coreStart.http.basePath.prepend;

    await waitFor(() => {
      expect(getByTestId('classicRulesPage')).toBeInTheDocument();
    });
    expect(getByTestId('v1RulesTab')).toHaveAttribute(
      'data-href',
      prepend(`${SEARCH_ALERTING_BASE_PATH}${SEARCH_ALERTING_RULES_V1_PATH}`)
    );
    expect(getByTestId('v2RulesTab')).toHaveAttribute(
      'data-href',
      prepend(`${SEARCH_ALERTING_BASE_PATH}${SEARCH_ALERTING_RULES_V2_PATH}`)
    );
    expect(getByTestId('v1RulesTab')).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId('v2RulesTab')).toHaveAttribute('aria-selected', 'false');
  });

  it('renders RulesPage at /rules/v2 with search host', async () => {
    const { getByTestId } = renderAt(SEARCH_ALERTING_RULES_V2_PATH);

    await waitFor(() => {
      expect(getByTestId(`rulesPage:${SEARCH_ALERTING_APP_ID}`)).toBeInTheDocument();
    });
  });

  it('passes search v1/v2 tab hrefs to the v2 rules page', async () => {
    const { getByTestId, coreStart } = renderAt(SEARCH_ALERTING_RULES_V2_PATH);
    const prepend = coreStart.http.basePath.prepend;

    await waitFor(() => {
      expect(getByTestId(`rulesPage:${SEARCH_ALERTING_APP_ID}`)).toBeInTheDocument();
    });
    expect(getByTestId('v1RulesTab')).toHaveAttribute(
      'data-href',
      prepend(`${SEARCH_ALERTING_BASE_PATH}${SEARCH_ALERTING_RULES_V1_PATH}`)
    );
    expect(getByTestId('v2RulesTab')).toHaveAttribute(
      'data-href',
      prepend(`${SEARCH_ALERTING_BASE_PATH}${SEARCH_ALERTING_RULES_V2_PATH}`)
    );
    expect(getByTestId('v2RulesTab')).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId('v1RulesTab')).toHaveAttribute('aria-selected', 'false');
  });

  it('renders RuleLibraryPage at /rule-library with search host', async () => {
    const { getByTestId } = renderAt(SEARCH_ALERTING_RULE_LIBRARY_PATH);

    await waitFor(() => {
      expect(getByTestId(`ruleLibraryPage:${SEARCH_ALERTING_APP_ID}`)).toBeInTheDocument();
    });
  });

  it('renders ActionPoliciesPage at /action-policies with search host', async () => {
    const { getByTestId } = renderAt(SEARCH_ALERTING_ACTION_POLICIES_PATH);

    await waitFor(() => {
      expect(getByTestId(`actionPoliciesPage:${SEARCH_ALERTING_APP_ID}`)).toBeInTheDocument();
    });
  });

  it('renders ExecutionHistoryPage at /execution-history with search host', async () => {
    const { getByTestId } = renderAt(SEARCH_ALERTING_EXECUTION_HISTORY_PATH);

    await waitFor(() => {
      expect(getByTestId(`executionHistoryPage:${SEARCH_ALERTING_APP_ID}`)).toBeInTheDocument();
    });
  });

  it('redirects unknown paths to inbox', () => {
    const { history } = renderAt('/unknown');

    expect(history.location.pathname).toBe(SEARCH_ALERTING_INBOX_PATH);
  });

  it.each([
    {
      path: SEARCH_ALERTING_INBOX_PATH,
      testId: `episodesPage:${SEARCH_ALERTING_APP_ID}`,
    },
    {
      path: SEARCH_ALERTING_RULES_V2_PATH,
      testId: `rulesPage:${SEARCH_ALERTING_APP_ID}`,
    },
    {
      path: SEARCH_ALERTING_RULE_LIBRARY_PATH,
      testId: `ruleLibraryPage:${SEARCH_ALERTING_APP_ID}`,
    },
    {
      path: SEARCH_ALERTING_ACTION_POLICIES_PATH,
      testId: `actionPoliciesPage:${SEARCH_ALERTING_APP_ID}`,
    },
    {
      path: SEARCH_ALERTING_EXECUTION_HISTORY_PATH,
      testId: `executionHistoryPage:${SEARCH_ALERTING_APP_ID}`,
    },
  ])('passes privilegeCheck to $testId at $path', async ({ path, testId }) => {
    const { getByTestId } = renderAt(path);

    await waitFor(() => {
      expect(getByTestId(testId)).toBeInTheDocument();
    });
    expect(getByTestId(testId)).toHaveAttribute('data-has-privilege-check', 'true');
  });
});
