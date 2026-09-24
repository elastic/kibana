/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type AutomationType = 'custom' | 'managed';

export type AlertStatus = 'active' | 'inactive' | 'any';
export type RuleNameMatchMode = 'substring' | 'regex';
export type SchedulePreset = 'hourly' | 'daily' | 'weekly' | 'custom';
export type DedupeMode = 'rule_id' | 'alert_id' | 'none';
export type OverlapPolicy = 'drop' | 'cancel_in_progress' | 'queue';
export type ReasoningMode = 'investigate' | 'observe';
export type CompletionAction = 'create_investigation' | 'post_to_slack' | 'silent';
export type CompletionTargetMode = 'thread' | 'channel' | 'self';

export type NightshiftTriggerRow =
  | {
      kind: 'alert';
      ruleNamePattern?: string;
      ruleNameMatchMode?: RuleNameMatchMode;
      alertStatus?: AlertStatus;
      tags?: string[];
    }
  | {
      kind: 'schedule';
      schedulePreset?: SchedulePreset;
      cronExpression?: string;
      timezone?: string;
      scopeQuery?: string;
    };

export interface NightshiftAutomationTrigger {
  rows: NightshiftTriggerRow[];
}

export interface NightshiftAutomationExecution {
  promptTemplate?: string;
  reasoningMode?: ReasoningMode;
  agentId?: string;
  connectorId?: string;
}

export interface NightshiftAutomationCompletion {
  action?: CompletionAction;
  targetMode?: CompletionTargetMode;
  destination?: string;
}

export interface NightshiftAutomationRuntime {
  dailyDispatchLimit?: number;
  timeoutSeconds?: number;
  dedupeWindowSeconds?: number;
  dedupeMode?: DedupeMode;
  overlapPolicy?: OverlapPolicy;
}

export interface NightshiftAutomationAttributes {
  name: string;
  description?: string;
  automationType: AutomationType;
  isEnabled: boolean;
  workflowId?: string;
  trigger: NightshiftAutomationTrigger;
  execution: NightshiftAutomationExecution;
  completion: NightshiftAutomationCompletion;
  runtime: NightshiftAutomationRuntime;
  createdAt: string;
  updatedAt: string;
}

export interface NightshiftAutomationRecord extends NightshiftAutomationAttributes {
  id: string;
}

export interface NightshiftAutomationBudgetAttributes {
  automationId: string;
  date: string;
  used: number;
}
