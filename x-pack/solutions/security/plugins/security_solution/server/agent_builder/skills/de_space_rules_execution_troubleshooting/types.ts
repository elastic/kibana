/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import type { IRuleMonitoringService } from '../../../lib/detection_engine/rule_monitoring';

export interface SkillDependencies {
  core: SecuritySolutionPluginCoreSetupDependencies;
  ruleMonitoringService: IRuleMonitoringService;
}
