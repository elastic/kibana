/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ChromeBreadcrumb } from '@kbn/core/public';
import type { AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
import { Route, Routes } from '@kbn/shared-ux-router';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_INBOX_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../constants';

const V1_RULES_APP_ID = 'rules';

const RedirectToPath = ({ to }: { to: string }) => {
  const history = useHistory();

  useEffect(() => {
    history.replace(to);
  }, [history, to]);

  return null;
};

const RedirectToV1Rules = ({ coreStart }: { coreStart: CoreStart }) => {
  useEffect(() => {
    void coreStart.application.navigateToApp(V1_RULES_APP_ID, { replace: true });
  }, [coreStart]);

  return null;
};

interface ObservabilityAlertingAppProps {
  coreStart: CoreStart;
  alertingVTwo: AlertingV2PublicStart;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[], appHistory?: unknown) => void;
}

export const ObservabilityAlertingApp = ({
  coreStart,
  alertingVTwo,
  setBreadcrumbs,
}: ObservabilityAlertingAppProps) => {
  const {
    RulesPage,
    RuleLibraryPage,
    EpisodesPage,
    ActionPoliciesPage,
    ExecutionHistoryPage,
  } = alertingVTwo;

  return (
    <Routes>
      <Route exact path="/">
        <RedirectToPath to={OBSERVABILITY_ALERTING_INBOX_PATH} />
      </Route>
      <Route path={OBSERVABILITY_ALERTING_RULES_V1_PATH}>
        <RedirectToV1Rules coreStart={coreStart} />
      </Route>
      <Route path={OBSERVABILITY_ALERTING_INBOX_PATH}>
        <EpisodesPage coreStart={coreStart} setBreadcrumbs={setBreadcrumbs} />
      </Route>
      <Route path={OBSERVABILITY_ALERTING_RULES_V2_PATH}>
        <RulesPage coreStart={coreStart} setBreadcrumbs={setBreadcrumbs} />
      </Route>
      <Route path={OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH}>
        <RuleLibraryPage coreStart={coreStart} setBreadcrumbs={setBreadcrumbs} />
      </Route>
      <Route path={OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH}>
        <ActionPoliciesPage coreStart={coreStart} setBreadcrumbs={setBreadcrumbs} />
      </Route>
      <Route path={OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH}>
        <ExecutionHistoryPage coreStart={coreStart} setBreadcrumbs={setBreadcrumbs} />
      </Route>
      <Route>
        <RedirectToPath to={OBSERVABILITY_ALERTING_INBOX_PATH} />
      </Route>
    </Routes>
  );
};
