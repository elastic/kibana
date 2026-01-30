/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/core/public';

export enum RuleUpgradeEventTypes {
  RuleUpgradeFlyoutButtonClick = 'Click Rule Upgrade Flyout Button',
  RuleUpgradeSingleButtonClick = 'Click Rule Upgrade Single Button',
  RuleUpgradeFlyoutOpen = 'Open Rule Upgrade Flyout',
}
interface ReportRuleUpgradeFlyoutButtonClickParams {
  type: 'update' | 'dismiss';
  hasBaseVersion: boolean;
  eventVersion: number;
}

interface ReportRuleUpgradeSingleButtonClickParams {
  hasBaseVersion: boolean;
}

interface ReportRuleUpgradeFlyoutOpenParams {
  hasBaseVersion: boolean;
  eventVersion: number;
}

export interface RuleUpgradeTelemetryEventsMap {
  [RuleUpgradeEventTypes.RuleUpgradeFlyoutButtonClick]: ReportRuleUpgradeFlyoutButtonClickParams;
  [RuleUpgradeEventTypes.RuleUpgradeSingleButtonClick]: ReportRuleUpgradeSingleButtonClickParams;
  [RuleUpgradeEventTypes.RuleUpgradeFlyoutOpen]: ReportRuleUpgradeFlyoutOpenParams;
}

export interface RuleUpgradeTelemetryEvent {
  eventType: RuleUpgradeEventTypes;
  schema: RootSchema<RuleUpgradeTelemetryEventsMap[RuleUpgradeEventTypes]>;
}
