/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ChromeBreadcrumb } from '@kbn/core/public';
import type { AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { EuiPageSection } from '@elastic/eui';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_INBOX_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../constants';

interface ObservabilityAlertingAppProps {
  coreStart: CoreStart;
  alertingVTwo: AlertingV2PublicStart;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}

export const ObservabilityAlertingApp = ({
  coreStart,
  alertingVTwo,
  setBreadcrumbs,
}: ObservabilityAlertingAppProps) => {
  const { RulesPage, RuleLibraryPage, EpisodesPage, ActionPoliciesPage, ExecutionHistoryPage } =
    alertingVTwo;

  return (
    <Routes>
      <Route exact path="/">
        <Redirect to={OBSERVABILITY_ALERTING_INBOX_PATH} />
      </Route>
      <Route path={OBSERVABILITY_ALERTING_INBOX_PATH}>
        <EuiPageSection paddingSize="m">
          <EpisodesPage
            basePath={OBSERVABILITY_ALERTING_INBOX_PATH}
            coreStart={coreStart}
            setBreadcrumbs={setBreadcrumbs}
          />
        </EuiPageSection>
      </Route>
      <Route path={OBSERVABILITY_ALERTING_RULES_V2_PATH}>
        <EuiPageSection paddingSize="m">
          <RulesPage
            basePath={OBSERVABILITY_ALERTING_RULES_V2_PATH}
            coreStart={coreStart}
            setBreadcrumbs={setBreadcrumbs}
          />
        </EuiPageSection>
      </Route>
      <Route path={OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH}>
        <EuiPageSection paddingSize="m">
          <RuleLibraryPage
            basePath={OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH}
            coreStart={coreStart}
            setBreadcrumbs={setBreadcrumbs}
          />
        </EuiPageSection>
      </Route>
      <Route path={OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH}>
        <EuiPageSection paddingSize="m">
          <ActionPoliciesPage
            basePath={OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH}
            coreStart={coreStart}
            setBreadcrumbs={setBreadcrumbs}
          />
        </EuiPageSection>
      </Route>
      <Route path={OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH}>
        <EuiPageSection paddingSize="m">
          <ExecutionHistoryPage
            basePath={OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH}
            coreStart={coreStart}
            setBreadcrumbs={setBreadcrumbs}
          />
        </EuiPageSection>
      </Route>
      <Redirect to={OBSERVABILITY_ALERTING_INBOX_PATH} />
    </Routes>
  );
};
