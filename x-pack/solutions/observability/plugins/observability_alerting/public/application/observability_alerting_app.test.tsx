/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
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

const createAlertingVTwo = (): AlertingV2PublicStart => ({
  CreateRuleOptionsFlyout: () => null,
  mountEpisodesApp: jest.fn(async ({ params }) => {
    params.element.setAttribute('data-test-subj', 'mounted-episodes');
    return () => undefined;
  }),
  mountRulesApp: jest.fn(async ({ params }) => {
    params.element.setAttribute('data-test-subj', 'mounted-rules');
    return () => undefined;
  }),
  mountRuleLibraryApp: jest.fn(async ({ params }) => {
    params.element.setAttribute('data-test-subj', 'mounted-rule-library');
    return () => undefined;
  }),
  mountActionPoliciesApp: jest.fn(async ({ params }) => {
    params.element.setAttribute('data-test-subj', 'mounted-action-policies');
    return () => undefined;
  }),
  mountExecutionHistoryApp: jest.fn(async ({ params }) => {
    params.element.setAttribute('data-test-subj', 'mounted-execution-history');
    return () => undefined;
  }),
});

const createHistory = (pathname: string) => {
  const history = createMemoryHistory({ initialEntries: [pathname] });
  (
    history as unknown as { createSubHistory: (basePath: string) => typeof history }
  ).createSubHistory = (basePath: string) =>
    createMemoryHistory({
      initialEntries: [history.location.pathname.slice(basePath.length) || '/'],
    });
  return history;
};

const renderAt = (pathname: string, alertingVTwo = createAlertingVTwo()) => {
  const coreStart = coreMock.createStart();
  const history = createHistory(pathname);

  const result = render(
    <Router history={history}>
      <ObservabilityAlertingApp alertingVTwo={alertingVTwo} coreStart={coreStart} />
    </Router>
  );

  return { ...result, alertingVTwo, coreStart, history };
};

describe('ObservabilityAlertingApp', () => {
  it('redirects / to inbox and mounts episodes', async () => {
    const { alertingVTwo } = renderAt('/');

    await waitFor(() => {
      expect(alertingVTwo.mountEpisodesApp).toHaveBeenCalled();
    });
  });

  it.each([
    [OBSERVABILITY_ALERTING_INBOX_PATH, 'mountEpisodesApp', 'mounted-episodes'],
    [OBSERVABILITY_ALERTING_RULES_V2_PATH, 'mountRulesApp', 'mounted-rules'],
    [OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH, 'mountRuleLibraryApp', 'mounted-rule-library'],
    [
      OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
      'mountActionPoliciesApp',
      'mounted-action-policies',
    ],
    [
      OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
      'mountExecutionHistoryApp',
      'mounted-execution-history',
    ],
  ] as const)('mounts %s via %s', async (path, mountKey, testSubj) => {
    const { alertingVTwo, getByTestId } = renderAt(path);

    await waitFor(() => {
      expect(alertingVTwo[mountKey]).toHaveBeenCalled();
      expect(getByTestId(testSubj)).toBeInTheDocument();
    });
  });

  it('navigates to the v1 rules app from /rules/v1', async () => {
    const { coreStart, alertingVTwo } = renderAt(OBSERVABILITY_ALERTING_RULES_V1_PATH);

    await waitFor(() => {
      expect(coreStart.application.navigateToApp).toHaveBeenCalledWith('rules', { replace: true });
    });
    expect(alertingVTwo.mountRulesApp).not.toHaveBeenCalled();
  });

  it('redirects unknown paths to inbox', async () => {
    const { alertingVTwo } = renderAt('/unknown');

    await waitFor(() => {
      expect(alertingVTwo.mountEpisodesApp).toHaveBeenCalled();
    });
  });
});
