/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Redirect } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import * as i18n from './translations';
import {
  COVERAGE_OVERVIEW_PATH,
  RULES_LANDING_PATH,
  RULES_PATH,
  SecurityPageName,
} from '../../common/constants';
import { NotFoundPage } from '../app/404';
import { RulesPage } from '../detection_engine/rule_management_ui/pages/rule_management';
import { CreateRulePage } from '../detection_engine/rule_creation_ui/pages/rule_creation';
import { RuleDetailsPage } from '../detection_engine/rule_details_ui/pages/rule_details';
import { EditRulePage } from '../detection_engine/rule_creation_ui/pages/rule_editing';
import { useReadonlyHeader } from '../use_readonly_header';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { AllRulesTabs } from '../detection_engine/rule_management_ui/components/rules_table/rules_table_toolbar';
import { AddRulesPage } from '../detection_engine/rule_management_ui/pages/add_rules';
import type { SecuritySubPluginRoutes } from '../app/types';
import { RulesLandingPage } from './landing';
import { CoverageOverviewPage } from '../detection_engine/rule_management_ui/pages/coverage_overview';
import { RuleDetailTabs } from '../detection_engine/rule_details_ui/pages/rule_details/use_rule_details_tabs';

const RulesSubRoutes = [
  {
    path: '/rules/id/:detailName/edit',
    main: EditRulePage,
    exact: true,
  },
  {
    path: `/rules/id/:detailName/:tabName(${RuleDetailTabs.alerts}|${RuleDetailTabs.exceptions}|${RuleDetailTabs.endpointExceptions}|${RuleDetailTabs.executionResults}|${RuleDetailTabs.executionEvents})`,
    main: RuleDetailsPage,
    exact: true,
  },
  {
    path: '/rules/create',
    main: CreateRulePage,
    exact: true,
  },
  {
    path: `/rules/:tabName(${AllRulesTabs.management}|${AllRulesTabs.monitoring}|${AllRulesTabs.updates})`,
    main: RulesPage,
    exact: true,
  },
  {
    path: '/rules/add_rules',
    main: AddRulesPage,
    exact: true,
  },
];

const RulesContainerComponent: React.FC = () => {
  useReadonlyHeader(i18n.READ_ONLY_BADGE_TOOLTIP);

  return (
    <PluginTemplateWrapper>
      <TrackApplicationView viewId={SecurityPageName.rules}>
        <Routes>
          <Route // Redirect to first tab if none specified
            path="/rules/id/:detailName"
            exact
            render={({
              match: {
                params: { detailName },
              },
              location,
            }) => (
              <Redirect
                to={{
                  ...location,
                  pathname: `/rules/id/${detailName}/${RuleDetailTabs.alerts}`,
                  search: location.search,
                }}
              />
            )}
          />
          <Route path="/rules" exact>
            <Redirect to={`/rules/${AllRulesTabs.management}`} />
          </Route>
          {RulesSubRoutes.map((route) => (
            <Route
              key={`rules-route-${route.path}`}
              path={route.path}
              exact={route?.exact ?? false}
            >
              <route.main />
            </Route>
          ))}
          <Route component={NotFoundPage} />
          <SpyRoute pageName={SecurityPageName.rules} />
        </Routes>
      </TrackApplicationView>
    </PluginTemplateWrapper>
  );
};

const Rules = React.memo(RulesContainerComponent);

const CoverageOverviewRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.coverageOverview}>
      <CoverageOverviewPage />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: RULES_LANDING_PATH,
    component: RulesLandingPage,
  },
  {
    path: RULES_PATH,
    component: Rules,
  },
  {
    path: COVERAGE_OVERVIEW_PATH,
    component: CoverageOverviewRoutes,
  },
];
