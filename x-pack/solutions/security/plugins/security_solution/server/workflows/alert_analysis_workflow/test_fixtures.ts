/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAlertType } from '../../lib/detection_engine/rule_schema';
import { ALERT_ANALYSIS_WORKFLOW_SYSTEM_CONNECTOR_ID } from './rule_attachments';

export const createWorkflowAction = (workflowId: string): RuleAlertType['actions'][number] =>
  ({
    actionTypeId: '.workflows',
    group: 'default',
    id: ALERT_ANALYSIS_WORKFLOW_SYSTEM_CONNECTOR_ID,
    params: {
      subAction: 'run',
      subActionParams: {
        workflowId,
        summaryMode: true,
      },
    },
  } as RuleAlertType['actions'][number]);

export const createWorkflowSystemAction = (
  workflowId: string
): NonNullable<RuleAlertType['systemActions']>[number] =>
  ({
    actionTypeId: '.workflows',
    id: ALERT_ANALYSIS_WORKFLOW_SYSTEM_CONNECTOR_ID,
    params: {
      subAction: 'run',
      subActionParams: {
        workflowId,
        summaryMode: true,
      },
    },
  } as NonNullable<RuleAlertType['systemActions']>[number]);

export const createConnectorAction = (): RuleAlertType['actions'][number] =>
  ({
    actionTypeId: '.server-log',
    group: 'default',
    id: 'connector-id',
    params: {
      message: 'Rule {{rule.name}} matched',
    },
    frequency: {
      summary: false,
      notifyWhen: 'onActiveAlert',
      throttle: null,
    },
  } as RuleAlertType['actions'][number]);

export const createRule = ({
  id,
  actions = [],
  systemActions = [],
  enabled = true,
}: {
  id: string;
  actions?: RuleAlertType['actions'];
  systemActions?: RuleAlertType['systemActions'];
  enabled?: boolean;
}): RuleAlertType =>
  ({
    id,
    name: `Rule ${id}`,
    enabled,
    actions,
    systemActions,
    params: {
      immutable: false,
    },
  } as RuleAlertType);
