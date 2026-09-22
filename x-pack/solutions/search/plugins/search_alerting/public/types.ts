/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';

export interface SearchAlertingSetupDependencies {
  alertingVTwo: Record<string, never>;
}

export interface SearchAlertingStartDependencies {
  alertingVTwo: AlertingV2PublicStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export type SearchAlertingPublicSetup = Record<string, never>;

export type SearchAlertingPublicStart = Record<string, never>;
