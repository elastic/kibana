/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAction, RuleSystemAction } from '@kbn/alerting-plugin/common';
import type { AlertsSelectionSettings } from '../../types';
import type { WorkflowConfiguration } from '../../workflow_configuration/types';

export interface AttackDiscoveryScheduleSchema {
  actions: Array<RuleAction | RuleSystemAction>;
  alertsSelectionSettings: AlertsSelectionSettings;
  connectorId?: string;
  interval: string;
  name: string;
  type?: string;
  workflowConfig?: WorkflowConfiguration;
}
