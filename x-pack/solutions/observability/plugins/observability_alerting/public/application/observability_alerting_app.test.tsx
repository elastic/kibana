/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, ScopedHistory } from '@kbn/core/public';
import type { AlertingV2PageProps } from '@kbn/alerting-v2-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import type { ClassicRulesPageProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_BASE_PATH,
} from '@kbn/deeplinks-observability';
import { ObservabilityAlertingApp } from './observability_alerting_app';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_INBOX_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../constants';

const Placeholder = ({
  name,
  privilegeCheck,
  ...rest
}: { name: string; privilegeCheck?: unknown } & Record<string, unknown>) => (
  <div data-test-subj={name} data-has-privilege-check={privilegeCheck != null} {...rest}>
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
  EpisodesPage: ({ hostApp, privilegeCheck, manageRulesHref }: AlertingV2PageProps) => (
    <Placeholder
      name={`episodesPage:${hostApp?.episodes?.app ?? 'none'}`}
      privilegeCheck={privilegeCheck}
      {...(manageRulesHref ? { 'data-manage-rules-href': manageRulesHref } : {})}
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

const v1RulesCapabilities = {
  navLinks: { uptime: true },
} as unknown as Capabilities;

const v2RulesCapabilities = {
  alerting_v2_rules: { read: true },
} as unknown as Capabilities;

const mixedRulesCapabilities = {
  navLinks: { uptime: true },
  alerting_v2_rules: { read: true },
} as unknown as Capabilities;

const renderAt = (pathname: string, capabilities?: Capabilities) => {
  const coreStart = coreMock.createStart();
  if (capabilities) {
    Object.assign(coreStart.application.capabilities, capabilities);
  }
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
  beforeEach(() => {
    mockTriggersActionsUi.getClassicRulesPage.mockClear();
  });

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
    expect(mockTriggersActionsUi.getClassicRulesPage).toHaveBeenCalledWith(
      expect.objectContaining({
        hideListBackButton: true,
        history,
        host: {
          app: OBSERVABILITY_ALERTING_APP_ID,
          pathPrefix: OBSERVABILITY_ALERTING_RULES_V1_PATH,
        },
      })
    );
  });

  it('shows both rules tabs for a mixed v1 and v2 user on the classic rules page', async () => {
    const { getByTestId, coreStart } = renderAt(
      OBSERVABILITY_ALERTING_RULES_V1_PATH,
      mixedRulesCapabilities
    );
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

  it('hides the rules tab bar for a v1-only user', async () => {
    const { getByTestId, queryAllByRole } = renderAt(
      OBSERVABILITY_ALERTING_RULES_V1_PATH,
      v1RulesCapabilities
    );

    await waitFor(() => {
      expect(getByTestId('classicRulesPage')).toBeInTheDocument();
    });
    expect(queryAllByRole('tab')).toHaveLength(0);
  });

  it('renders RulesPage at /rules/v2 with observability host', async () => {
    const { getByTestId } = renderAt(OBSERVABILITY_ALERTING_RULES_V2_PATH);

    await waitFor(() => {
      expect(getByTestId(`rulesPage:${OBSERVABILITY_ALERTING_APP_ID}`)).toBeInTheDocument();
    });
  });

  it('shows both rules tabs for a mixed v1 and v2 user on the v2 rules page', async () => {
    const { getByTestId, coreStart } = renderAt(
      OBSERVABILITY_ALERTING_RULES_V2_PATH,
      mixedRulesCapabilities
    );
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

  it('hides the rules tab bar for a v2-only user', async () => {
    const { getByTestId, queryAllByRole } = renderAt(
      OBSERVABILITY_ALERTING_RULES_V2_PATH,
      v2RulesCapabilities
    );

    await waitFor(() => {
      expect(getByTestId(`rulesPage:${OBSERVABILITY_ALERTING_APP_ID}`)).toBeInTheDocument();
    });
    expect(queryAllByRole('tab')).toHaveLength(0);
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

  it.each([
    {
      path: OBSERVABILITY_ALERTING_INBOX_PATH,
      testId: `episodesPage:${OBSERVABILITY_ALERTING_APP_ID}`,
      hasPrivilegeCheck: 'true',
    },
    {
      path: OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
      testId: `ruleLibraryPage:${OBSERVABILITY_ALERTING_APP_ID}`,
      hasPrivilegeCheck: 'true',
    },
    {
      path: OBSERVABILITY_ALERTING_RULES_V2_PATH,
      testId: `rulesPage:${OBSERVABILITY_ALERTING_APP_ID}`,
      hasPrivilegeCheck: 'false',
    },
    {
      path: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
      testId: `actionPoliciesPage:${OBSERVABILITY_ALERTING_APP_ID}`,
      hasPrivilegeCheck: 'false',
    },
    {
      path: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
      testId: `executionHistoryPage:${OBSERVABILITY_ALERTING_APP_ID}`,
      hasPrivilegeCheck: 'false',
    },
  ])(
    'sets privilegeCheck=$hasPrivilegeCheck on $testId at $path',
    async ({ path, testId, hasPrivilegeCheck }) => {
      const { getByTestId } = renderAt(path);

      await waitFor(() => {
        expect(getByTestId(testId)).toBeInTheDocument();
      });
      expect(getByTestId(testId)).toHaveAttribute('data-has-privilege-check', hasPrivilegeCheck);
    }
  );

  it('passes manageRulesHref pointing to /rules/v2 for a v2-only user', async () => {
    const { getByTestId, coreStart } = renderAt(
      OBSERVABILITY_ALERTING_INBOX_PATH,
      v2RulesCapabilities
    );
    const prepend = coreStart.http.basePath.prepend;

    await waitFor(() => {
      expect(getByTestId(`episodesPage:${OBSERVABILITY_ALERTING_APP_ID}`)).toBeInTheDocument();
    });
    expect(getByTestId(`episodesPage:${OBSERVABILITY_ALERTING_APP_ID}`)).toHaveAttribute(
      'data-manage-rules-href',
      prepend(`${OBSERVABILITY_ALERTING_BASE_PATH}${OBSERVABILITY_ALERTING_RULES_V2_PATH}`)
    );
  });

  it('passes manageRulesHref pointing to /rules/v2 for a mixed v1+v2 user', async () => {
    const { getByTestId, coreStart } = renderAt(
      OBSERVABILITY_ALERTING_INBOX_PATH,
      mixedRulesCapabilities
    );
    const prepend = coreStart.http.basePath.prepend;

    await waitFor(() => {
      expect(getByTestId(`episodesPage:${OBSERVABILITY_ALERTING_APP_ID}`)).toBeInTheDocument();
    });
    expect(getByTestId(`episodesPage:${OBSERVABILITY_ALERTING_APP_ID}`)).toHaveAttribute(
      'data-manage-rules-href',
      prepend(`${OBSERVABILITY_ALERTING_BASE_PATH}${OBSERVABILITY_ALERTING_RULES_V2_PATH}`)
    );
  });

  it('passes manageRulesHref pointing to /rules/v1 for a v1-only user', async () => {
    const { getByTestId, coreStart } = renderAt(
      OBSERVABILITY_ALERTING_INBOX_PATH,
      v1RulesCapabilities
    );
    const prepend = coreStart.http.basePath.prepend;

    await waitFor(() => {
      expect(getByTestId(`episodesPage:${OBSERVABILITY_ALERTING_APP_ID}`)).toBeInTheDocument();
    });
    expect(getByTestId(`episodesPage:${OBSERVABILITY_ALERTING_APP_ID}`)).toHaveAttribute(
      'data-manage-rules-href',
      prepend(`${OBSERVABILITY_ALERTING_BASE_PATH}${OBSERVABILITY_ALERTING_RULES_V1_PATH}`)
    );
  });
});
