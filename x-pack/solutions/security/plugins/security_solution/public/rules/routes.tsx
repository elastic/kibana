/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { Redirect } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import type { Capabilities } from '@kbn/core-capabilities-common';
import {
  RULES_UI_EDIT_PRIVILEGE,
  RULES_UI_READ_PRIVILEGE,
} from '@kbn/security-solution-features/constants';
import * as i18n from './translations';
import {
  COVERAGE_OVERVIEW_PATH,
  DE_RULE_HEALTH_PATH,
  DE_SPACE_RULES_HEALTH_PATH,
  ENABLE_DE_HEALTH_UI_SETTING,
  RULES_LANDING_PATH,
  RULES_PATH,
  AI_RULE_CREATION_PATH,
  SecurityPageName,
} from '../../common/constants';
import { useIsExperimentalFeatureEnabled } from '../common/hooks/use_experimental_features';
import { NotFoundPage } from '../app/404';
import { RulesPage } from '../detection_engine/rule_management_ui/pages/rule_management';
import { CreateRulePage } from '../detection_engine/rule_creation_ui/pages/rule_creation';
import { AiRuleCreationPage } from '../detection_engine/rule_creation_ui/pages/ai_rule_creation/ai_rule_creation_page';
import { RuleDetailsPage } from '../detection_engine/rule_details_ui/pages/rule_details';
import { EditRulePage } from '../detection_engine/rule_creation_ui/pages/rule_editing';
import { useReadonlyHeader } from '../use_readonly_header';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { AllRulesTabs } from '../detection_engine/rule_management_ui/components/rules_table/rules_table_toolbar';
import { AddRulesPage } from '../detection_engine/rule_management_ui/pages/add_rules';
import {
  DetectionEngineRuleHealthPage,
  DetectionEngineSpaceRulesHealthPage,
} from '../detection_engine/rule_monitoring_ui/pages';
import type { SecuritySubPluginRoutes } from '../app/types';
import { RulesLandingPage } from './landing';
import { CoverageOverviewPage } from '../detection_engine/rule_management_ui/pages/coverage_overview';
import { RuleDetailTabs } from '../detection_engine/rule_details_ui/pages/rule_details/use_rule_details_tabs';
import { withSecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { hasCapabilities } from '../common/lib/capabilities';
import { useKibana, useUiSetting$ } from '../common/lib/kibana/kibana_react';

interface Features {
  deHealthUIEnabled: boolean;
  ruleHealthUIEnabled: boolean;
}

const getRulesSubRoutes = (
  capabilities: Capabilities,
  { deHealthUIEnabled, ruleHealthUIEnabled }: Features
) => [
  ...(hasCapabilities(capabilities, RULES_UI_READ_PRIVILEGE) // regular detection rules are enabled
    ? [
        {
          path: `/rules/id/:detailName/:tabName(${RuleDetailTabs.alerts}|${RuleDetailTabs.exceptions}|${RuleDetailTabs.endpointExceptions}|${RuleDetailTabs.executionResults}|${RuleDetailTabs.executionEvents})`,
          main: RuleDetailsPage,
          exact: true,
        },
        {
          path: `/rules/:tabName(${AllRulesTabs.management}|${AllRulesTabs.monitoring}|${AllRulesTabs.updates})`,
          main: RulesPage,
          exact: true,
        },
        {
          path: '/rules/add_rules',
          main: withSecurityRoutePageWrapper(AddRulesPage, SecurityPageName.rulesAdd, {
            omitSpyRoute: true,
          }),
          exact: true,
        },
        // Detection Engine Health UI Routes
        ...(deHealthUIEnabled
          ? [
              {
                path: DE_SPACE_RULES_HEALTH_PATH,
                main: DetectionEngineSpaceRulesHealthPage,
                exact: true,
              },
            ]
          : []),
        ...(ruleHealthUIEnabled
          ? [
              {
                path: DE_RULE_HEALTH_PATH,
                main: DetectionEngineRuleHealthPage,
                exact: true,
              },
            ]
          : []),
      ]
    : []),
  ...(hasCapabilities(capabilities, RULES_UI_EDIT_PRIVILEGE)
    ? [
        {
          path: '/rules/id/:detailName/edit',
          main: EditRulePage,
          exact: true,
        },
        {
          path: '/rules/create',
          main: withSecurityRoutePageWrapper(CreateRulePage, SecurityPageName.rulesCreate, {
            omitSpyRoute: true,
          }),
          exact: true,
        },
        {
          path: AI_RULE_CREATION_PATH,
          main: withSecurityRoutePageWrapper(AiRuleCreationPage, SecurityPageName.aiRuleCreation, {
            omitSpyRoute: true,
          }),
          exact: true,
        },
      ]
    : []),
];

const RulesContainerComponent: React.FC = () => {
  useReadonlyHeader(i18n.READ_ONLY_BADGE_TOOLTIP);
  const { capabilities } = useKibana().services.application;
  const deHealthUiFFEnabled = useIsExperimentalFeatureEnabled('deHealthUIEnabled');
  const ruleHealthUiFFEnabled = useIsExperimentalFeatureEnabled('ruleHealthUIEnabled');
  const [deHealthUIAdvancedSetting] = useUiSetting$<boolean>(ENABLE_DE_HEALTH_UI_SETTING, false);
  const deHealthUIEnabled = deHealthUiFFEnabled && deHealthUIAdvancedSetting;
  const ruleHealthUIEnabled = ruleHealthUiFFEnabled && deHealthUIAdvancedSetting;

  const subRoutes = useMemo(() => {
    return getRulesSubRoutes(capabilities, { deHealthUIEnabled, ruleHealthUIEnabled }).map(
      (route) => (
        <Route key={`rules-route-${route.path}`} path={route.path} exact={route?.exact ?? false}>
          <route.main />
        </Route>
      )
    );
  }, [capabilities, deHealthUIEnabled, ruleHealthUIEnabled]);

  return (
    <PluginTemplateWrapper>
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
        {subRoutes}
        <Route component={NotFoundPage} />
        <SpyRoute pageName={SecurityPageName.rules} />
      </Routes>
    </PluginTemplateWrapper>
  );
};

const Rules = React.memo(RulesContainerComponent);

const CoverageOverviewRoutes = () => (
  <PluginTemplateWrapper>
    <CoverageOverviewPage />
  </PluginTemplateWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: RULES_LANDING_PATH,
    component: withSecurityRoutePageWrapper(RulesLandingPage, SecurityPageName.rulesLanding, {
      omitSpyRoute: true,
    }),
  },
  {
    path: RULES_PATH,
    component: withSecurityRoutePageWrapper(Rules, SecurityPageName.rules, {
      omitSpyRoute: true,
    }),
  },
  {
    path: COVERAGE_OVERVIEW_PATH,
    component: withSecurityRoutePageWrapper(
      CoverageOverviewRoutes,
      SecurityPageName.coverageOverview
    ),
  },
];
