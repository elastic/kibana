/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import type { IBasePath } from '@kbn/core/server';
import { sloBurnRateRuleType } from './slo_burn_rate';

export function registerBurnRateRule(
  alertingPlugin: AlertingServerSetup,
  basePath: IBasePath,
  isCpsEnabled: boolean = false
) {
  alertingPlugin.registerType(sloBurnRateRuleType(basePath, isCpsEnabled));
}
