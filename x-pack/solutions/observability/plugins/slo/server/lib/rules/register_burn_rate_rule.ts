/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import { IBasePath, Logger } from '@kbn/core/server';
import { IRuleDataService } from '@kbn/rule-registry-plugin/server';
import { CustomThresholdLocators } from '@kbn/observability-plugin/server';
import { sloBurnRateRuleType } from './slo_burn_rate';

export function registerBurnRateRule(
  alertingPlugin: AlertingServerSetup,
  basePath: IBasePath,
  logger: Logger,
  ruleDataService: IRuleDataService,
  locators: CustomThresholdLocators // TODO move this somewhere else, or use only alertsLocator
) {
  // SLO RULE
  alertingPlugin.registerType(sloBurnRateRuleType(basePath, locators.alertsLocator));
}
