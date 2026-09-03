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
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../constants';

const renderAt = (pathname: string) => {
  const coreStart = coreMock.createStart();
  const history = createMemoryHistory({ initialEntries: [pathname] });

  const result = render(
    <Router history={history}>
      <ObservabilityAlertingApp coreStart={coreStart} />
    </Router>
  );

  return { ...result, coreStart, history };
};

describe('ObservabilityAlertingApp', () => {
  it('redirects / to inbox', async () => {
    const { getByTestId } = renderAt('/');

    await waitFor(() => {
      expect(getByTestId('observabilityAlertingInbox')).toBeInTheDocument();
    });
  });

  it.each([
    [OBSERVABILITY_ALERTING_INBOX_PATH, 'observabilityAlertingInbox'],
    [OBSERVABILITY_ALERTING_RULES_V2_PATH, 'observabilityAlertingRulesV2'],
    [OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH, 'observabilityAlertingRuleLibrary'],
    [OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH, 'observabilityAlertingActionPolicies'],
    [OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH, 'observabilityAlertingExecutionHistory'],
  ] as const)('renders a placeholder for %s', async (path, testSubj) => {
    const { getByTestId } = renderAt(path);

    await waitFor(() => {
      expect(getByTestId(testSubj)).toBeInTheDocument();
    });
  });

  it('navigates to the v1 rules app from /rules/v1', async () => {
    const { coreStart } = renderAt(OBSERVABILITY_ALERTING_RULES_V1_PATH);

    await waitFor(() => {
      expect(coreStart.application.navigateToApp).toHaveBeenCalledWith('rules', { replace: true });
    });
  });

  it('redirects unknown paths to inbox', async () => {
    const { getByTestId } = renderAt('/unknown');

    await waitFor(() => {
      expect(getByTestId('observabilityAlertingInbox')).toBeInTheDocument();
    });
  });
});
