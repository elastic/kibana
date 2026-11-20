/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { ConfigType } from '../../../../config';
import { getPrebuiltRulesAndTimelinesStatusRoute } from './get_prebuilt_rules_and_timelines_status/get_prebuilt_rules_and_timelines_status_route';
import { getPrebuiltRulesStatusRoute } from './get_prebuilt_rules_status/get_prebuilt_rules_status_route';
import { installPrebuiltRulesAndTimelinesRoute } from './install_prebuilt_rules_and_timelines/install_prebuilt_rules_and_timelines_route';
import { reviewRuleInstallationRoute } from './review_rule_installation/review_rule_installation_route';
import { reviewRuleUpgradeRoute } from './review_rule_upgrade/review_rule_upgrade_route';
import { performRuleInstallationRoute } from './perform_rule_installation/perform_rule_installation_route';
import { performRuleUpgradeRoute } from './perform_rule_upgrade/perform_rule_upgrade_route';
import { bootstrapEaseRulesRoute } from './bootstrap_ease_rules/bootstrap_ease_rules';
import { getPrebuiltRuleBaseVersion } from './get_prebuilt_rule_base_version/get_prebuilt_rule_base_version_route';
import { revertPrebuiltRule } from './revert_prebuilt_rule/revert_prebuilt_rule_route';
import { reviewRuleDeprecationRoute } from './review_rule_deprecation/review_rule_deprecation_route';
import { browseRuleLibraryRoute } from './browse_rule_library/browse_rule_library_route';
import { getRuleLibraryRuleRoute } from './get_rule_library_rule/get_rule_library_rule_route';
import { listRuleLibraryTagsRoute } from './list_rule_library_tags/list_rule_library_tags_route';
import { listRuleLibrariesRoute } from './list_rule_libraries/list_rule_libraries_route';
import { createRuleLibraryRoute } from './create_rule_library/create_rule_library_route';
import { deleteRuleLibraryRoute } from './delete_rule_library/delete_rule_library_route';
import { scanRuleLibraryRoute } from './scan_rule_library/scan_rule_library_route';
import { syncRuleLibrariesRoute } from './sync_rule_libraries/sync_rule_libraries_route';

export const registerPrebuiltRulesRoutes = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  config: ConfigType
) => {
  // Legacy endpoints that we're going to deprecate
  getPrebuiltRulesAndTimelinesStatusRoute(router, logger);
  installPrebuiltRulesAndTimelinesRoute(router, logger);

  // New endpoints for the rule upgrade and installation workflows
  getPrebuiltRulesStatusRoute(router);
  performRuleInstallationRoute(router, logger);
  performRuleUpgradeRoute(router, logger);
  reviewRuleInstallationRoute(router, logger);
  reviewRuleUpgradeRoute(router, logger);
  bootstrapEaseRulesRoute(router, logger);
  getPrebuiltRuleBaseVersion(router);
  revertPrebuiltRule(router);
  reviewRuleDeprecationRoute(router);

  if (config.experimentalFeatures.ruleLibrariesEnabled) {
    listRuleLibrariesRoute(router, logger);
    browseRuleLibraryRoute(router, logger);
    listRuleLibraryTagsRoute(router, logger);
    getRuleLibraryRuleRoute(router, logger);
    scanRuleLibraryRoute(router, logger);
    createRuleLibraryRoute(router, logger);
    deleteRuleLibraryRoute(router, logger);
    syncRuleLibrariesRoute(router, logger);
  }
};
