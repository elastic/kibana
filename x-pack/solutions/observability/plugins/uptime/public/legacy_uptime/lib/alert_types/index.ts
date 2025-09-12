/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { ObservabilityRuleTypeModel } from '@kbn/observability-plugin/public';
import type { RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { initMonitorStatusAlertType } from './monitor_status';
import { initTlsAlertType } from './tls';
import { initTlsLegacyAlertType } from './tls_legacy';
import type { ClientPluginsStart } from '../../../plugin';
import { initDurationAnomalyAlertType } from './duration_anomaly';

export type AlertTypeInitializer<TAlertTypeModel = ObservabilityRuleTypeModel> = (dependencies: {
  isHidden: boolean;
  stackVersion: string;
  core: CoreStart;
  plugins: ClientPluginsStart;
}) => TAlertTypeModel;

export const uptimeAlertTypeInitializers: AlertTypeInitializer[] = [
  initMonitorStatusAlertType,
  initTlsAlertType,
  initDurationAnomalyAlertType,
];

export const legacyAlertTypeInitializers: Array<AlertTypeInitializer<RuleTypeModel>> = [
  initTlsLegacyAlertType,
];
