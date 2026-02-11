/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleUpgradeTelemetryEvent } from './types';
import { RuleUpgradeEventTypes } from './types';

export const ruleUpgradeFlyoutButtonClickEvent: RuleUpgradeTelemetryEvent = {
  eventType: RuleUpgradeEventTypes.RuleUpgradeFlyoutButtonClick,
  schema: {
    type: {
      type: 'keyword',
      _meta: {
        description: 'Click Rule Upgrade Flyout Button (update|dismiss)',
        optional: false,
      },
    },
    hasBaseVersion: {
      type: 'boolean',
      _meta: {
        description: 'Indicates if the rule has a missing base version',
        optional: false,
      },
    },
    eventVersion: {
      type: 'integer',
      _meta: {
        description: 'Indicates the version of the event',
        optional: false,
      },
    },
  },
};

export const ruleUpgradeSingleButtonClickEvent: RuleUpgradeTelemetryEvent = {
  eventType: RuleUpgradeEventTypes.RuleUpgradeSingleButtonClick,
  schema: {
    hasBaseVersion: {
      type: 'boolean',
      _meta: {
        description: 'Indicates if the rule has base version',
        optional: false,
      },
    },
  },
};

export const ruleUpgradeOpenFlyoutEvent: RuleUpgradeTelemetryEvent = {
  eventType: RuleUpgradeEventTypes.RuleUpgradeFlyoutOpen,
  schema: {
    hasBaseVersion: {
      type: 'boolean',
      _meta: {
        description: 'Indicates if the rule has a missing base version',
        optional: false,
      },
    },
    eventVersion: {
      type: 'integer',
      _meta: {
        description: 'Indicates the version of the event',
        optional: false,
      },
    },
  },
};

export const ruleUpgradeTelemetryEvents = [
  ruleUpgradeFlyoutButtonClickEvent,
  ruleUpgradeOpenFlyoutEvent,
  ruleUpgradeSingleButtonClickEvent,
];
