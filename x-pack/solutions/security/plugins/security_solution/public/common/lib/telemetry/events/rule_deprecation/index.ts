/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleDeprecationTelemetryEvent } from './types';
import { RuleDeprecationEventTypes } from './types';

const countSchema = {
  count: {
    type: 'integer' as const,
    _meta: {
      description: 'Number of deprecated rules',
      optional: false as const,
    },
  },
};

const deprecatedRulesCalloutShownEvent: RuleDeprecationTelemetryEvent = {
  eventType: RuleDeprecationEventTypes.DeprecatedRulesCalloutShown,
  schema: countSchema,
};

const deprecatedRulesCalloutDismissedEvent: RuleDeprecationTelemetryEvent = {
  eventType: RuleDeprecationEventTypes.DeprecatedRulesCalloutDismissed,
  schema: countSchema,
};

const deprecatedRulesModalOpenedEvent: RuleDeprecationTelemetryEvent = {
  eventType: RuleDeprecationEventTypes.DeprecatedRulesModalOpened,
  schema: countSchema,
};

const deprecatedRulesModalRuleLinkClickedEvent: RuleDeprecationTelemetryEvent = {
  eventType: RuleDeprecationEventTypes.DeprecatedRulesModalRuleLinkClicked,
  schema: countSchema,
};

const deprecatedRulesDeleteAllClickedEvent: RuleDeprecationTelemetryEvent = {
  eventType: RuleDeprecationEventTypes.DeprecatedRulesDeleteAllClicked,
  schema: countSchema,
};

const deprecatedRuleDeleteClickedEvent: RuleDeprecationTelemetryEvent = {
  eventType: RuleDeprecationEventTypes.DeprecatedRuleDeleteClicked,
  schema: countSchema,
};

const deprecatedRuleDuplicateAndDeleteClickedEvent: RuleDeprecationTelemetryEvent = {
  eventType: RuleDeprecationEventTypes.DeprecatedRuleDuplicateAndDeleteClicked,
  schema: countSchema,
};

export const ruleDeprecationTelemetryEvents = [
  deprecatedRulesCalloutShownEvent,
  deprecatedRulesCalloutDismissedEvent,
  deprecatedRulesModalOpenedEvent,
  deprecatedRulesModalRuleLinkClickedEvent,
  deprecatedRulesDeleteAllClickedEvent,
  deprecatedRuleDeleteClickedEvent,
  deprecatedRuleDuplicateAndDeleteClickedEvent,
];
