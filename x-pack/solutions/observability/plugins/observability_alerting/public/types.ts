/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';

export interface ObservabilityAlertingSetupDependencies {
  alertingVTwo: Record<string, never>;
}

export interface ObservabilityAlertingStartDependencies {
  alertingVTwo: AlertingV2PublicStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

/* eslint-disable-next-line @typescript-eslint/no-empty-interface */
export interface ObservabilityAlertingPublicSetup {}

/* eslint-disable-next-line @typescript-eslint/no-empty-interface */
export interface ObservabilityAlertingPublicStart {}
