/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './api/register_routes';

export { legacyRulesNotificationRuleType } from './logic/notifications/legacy_rules_notification_rule_type';

export { isLegacyNotificationRuleExecutor } from './logic/notifications/legacy_types';

export type {
  LegacyRuleNotificationRuleType,
  LegacyRuleNotificationRuleTypeParams,
} from './logic/notifications/legacy_types';
export type { NotificationRuleTypeParams } from './logic/notifications/schedule_notification_actions';
export { scheduleNotificationActions } from './logic/notifications/schedule_notification_actions';
export { scheduleThrottledNotificationActions } from './logic/notifications/schedule_throttle_notification_actions';
export { getNotificationResultsLink } from './logic/notifications/utils';

export type { LegacyRulesActionsSavedObject } from './logic/rule_actions/legacy_get_rule_actions_saved_object';

export { legacyGetRuleActionsSavedObject } from './logic/rule_actions/legacy_get_rule_actions_saved_object';

export {
  legacyType,
  legacyRuleActionsSavedObjectType,
} from './logic/rule_actions/legacy_saved_object_mappings';

export type {
  LegacyRuleActions,
  LegacyRuleAlertAction,
  LegacyIRuleActionsAttributes,
  LegacyRuleAlertSavedObjectAction,
  LegacyIRuleActionsAttributesSavedObjectAttributes,
} from './logic/rule_actions/legacy_types';
