/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ChromeBreadcrumb, ScopedHistory } from '@kbn/core/public';
import type { AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { OBSERVABILITY_ALERTING_APP_ID } from '@kbn/deeplinks-observability';
import { Route, Routes } from '@kbn/shared-ux-router';
import React, { useMemo } from 'react';
import { Redirect } from 'react-router-dom';
import { EuiPageSection } from '@elastic/eui';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_INBOX_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../constants';

interface ObservabilityAlertingAppProps {
  coreStart: CoreStart;
  alertingVTwo: AlertingV2PublicStart;
  triggersActionsUi: Pick<TriggersAndActionsUIPublicPluginStart, 'getClassicRulesPage'>;
  history: ScopedHistory;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}

const ClassicRulesV1Route = ({
  coreStart,
  getClassicRulesPage,
  history,
  setBreadcrumbs,
}: {
  coreStart: CoreStart;
  getClassicRulesPage: TriggersAndActionsUIPublicPluginStart['getClassicRulesPage'];
  history: ScopedHistory;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}) => {
  const classicRulesHistory = useMemo(
    () => history.createSubHistory(OBSERVABILITY_ALERTING_RULES_V1_PATH),
    [history]
  );

  return getClassicRulesPage({
    coreStart,
    setBreadcrumbs,
    history: classicRulesHistory,
    hideListBackButton: true,
    host: {
      app: OBSERVABILITY_ALERTING_APP_ID,
      basePath: OBSERVABILITY_ALERTING_RULES_V1_PATH,
    },
  });
};

export const ObservabilityAlertingApp = ({
  coreStart,
  alertingVTwo,
  triggersActionsUi,
  history,
  setBreadcrumbs,
}: ObservabilityAlertingAppProps) => {
  const {
    RulesPage,
    RuleLibraryPage,
    EpisodesPage,
    ActionPoliciesPage,
    ExecutionHistoryPage,
    createAlertingV2HostApp,
  } = alertingVTwo;

  const hostApp = useMemo(
    () =>
      createAlertingV2HostApp(OBSERVABILITY_ALERTING_APP_ID, {
        rules: OBSERVABILITY_ALERTING_RULES_V2_PATH,
        ruleLibrary: OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
        episodes: OBSERVABILITY_ALERTING_INBOX_PATH,
        actionPolicies: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
        executionHistory: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
      }),
    [createAlertingV2HostApp]
  );

  return (
    <Routes>
      <Route exact path="/">
        <Redirect to={OBSERVABILITY_ALERTING_INBOX_PATH} />
      </Route>
      <Route path={OBSERVABILITY_ALERTING_INBOX_PATH}>
        <EuiPageSection paddingSize="m">
          <EpisodesPage coreStart={coreStart} setBreadcrumbs={setBreadcrumbs} hostApp={hostApp} />
        </EuiPageSection>
      </Route>
      <Route path={OBSERVABILITY_ALERTING_RULES_V1_PATH}>
        <EuiPageSection paddingSize="m">
          <ClassicRulesV1Route
            coreStart={coreStart}
            getClassicRulesPage={triggersActionsUi.getClassicRulesPage}
            history={history}
            setBreadcrumbs={setBreadcrumbs}
          />
        </EuiPageSection>
      </Route>
      <Route path={OBSERVABILITY_ALERTING_RULES_V2_PATH}>
        <EuiPageSection paddingSize="m">
          <RulesPage coreStart={coreStart} setBreadcrumbs={setBreadcrumbs} hostApp={hostApp} />
        </EuiPageSection>
      </Route>
      <Route path={OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH}>
        <EuiPageSection paddingSize="m">
          <RuleLibraryPage
            coreStart={coreStart}
            setBreadcrumbs={setBreadcrumbs}
            hostApp={hostApp}
          />
        </EuiPageSection>
      </Route>
      <Route path={OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH}>
        <EuiPageSection paddingSize="m">
          <ActionPoliciesPage
            coreStart={coreStart}
            setBreadcrumbs={setBreadcrumbs}
            hostApp={hostApp}
          />
        </EuiPageSection>
      </Route>
      <Route path={OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH}>
        <EuiPageSection paddingSize="m">
          <ExecutionHistoryPage
            coreStart={coreStart}
            setBreadcrumbs={setBreadcrumbs}
            hostApp={hostApp}
          />
        </EuiPageSection>
      </Route>
      <Redirect to={OBSERVABILITY_ALERTING_INBOX_PATH} />
    </Routes>
  );
};
