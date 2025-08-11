/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/core/public';

export enum RuleUpgradeEventTypes {
  RuleUpgradeFlyoutButtonClick = 'Click Rule Upgrade Flyout Button',
  RuleUpgradeFlyoutOpen = 'Open Rule Upgrade Flyout',
}
interface ReportRuleUpgradeFlyoutButtonClickParams {
  type: 'update' | 'dismiss';
  hasMissingBaseVersion: boolean;
}

interface ReportRuleUpgradeFlyoutOpenParams {
  hasMissingBaseVersion: boolean;
}

export interface RuleUpgradeTelemetryEventsMap {
  [RuleUpgradeEventTypes.RuleUpgradeFlyoutButtonClick]: ReportRuleUpgradeFlyoutButtonClickParams;
  [RuleUpgradeEventTypes.RuleUpgradeFlyoutOpen]: ReportRuleUpgradeFlyoutOpenParams;
}

export interface RuleUpgradeTelemetryEvent {
  eventType: RuleUpgradeEventTypes;
  schema: RootSchema<RuleUpgradeTelemetryEventsMap[RuleUpgradeEventTypes]>;
}
