/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionPluginRouter } from '../../../../types';
import { getPrebuiltRulesAndTimelinesStatusRoute } from './get_prebuilt_rules_and_timelines_status/get_prebuilt_rules_and_timelines_status_route';
import { getPrebuiltRulesStatusRoute } from './get_prebuilt_rules_status/get_prebuilt_rules_status_route';
import { installPrebuiltRulesAndTimelinesRoute } from './install_prebuilt_rules_and_timelines/install_prebuilt_rules_and_timelines_route';
import { reviewRuleInstallationRoute } from './review_rule_installation/review_rule_installation_route';
import { reviewRuleUpgradeRoute } from './review_rule_upgrade/review_rule_upgrade_route';
import { performRuleInstallationRoute } from './perform_rule_installation/perform_rule_installation_route';
import { performRuleUpgradeRoute } from './perform_rule_upgrade/perform_rule_upgrade_route';
import { bootstrapPrebuiltRulesRoute } from './bootstrap_prebuilt_rules/bootstrap_prebuilt_rules';

export const registerPrebuiltRulesRoutes = (router: SecuritySolutionPluginRouter) => {
  // Legacy endpoints that we're going to deprecate
  getPrebuiltRulesAndTimelinesStatusRoute(router);
  installPrebuiltRulesAndTimelinesRoute(router);

  // New endpoints for the rule upgrade and installation workflows
  getPrebuiltRulesStatusRoute(router);
  performRuleInstallationRoute(router);
  performRuleUpgradeRoute(router);
  reviewRuleInstallationRoute(router);
  reviewRuleUpgradeRoute(router);
  bootstrapPrebuiltRulesRoute(router);
};
