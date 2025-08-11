/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleUpgradeTelemetryEvent } from './types';
import { RuleUpgradeEventTypes } from './types';

export const flyoutButtonClickEvent: RuleUpgradeTelemetryEvent = {
  eventType: RuleUpgradeEventTypes.RuleUpgradeFlyoutButtonClick,
  schema: {
    type: {
      type: 'keyword',
      _meta: {
        description: 'Click Rule Upgrade Flyout Button (update|dismiss)',
        optional: false,
      },
    },
    hasMissingBaseVersion: {
      type: 'boolean',
      _meta: {
        description: 'Indicates if the rule has a missing base version',
        optional: false,
      },
    },
  },
};

export const openFlyoutEvent: RuleUpgradeTelemetryEvent = {
  eventType: RuleUpgradeEventTypes.RuleUpgradeFlyoutOpen,
  schema: {
    hasMissingBaseVersion: {
      type: 'boolean',
      _meta: {
        description: 'Indicates if the rule has a missing base version',
        optional: false,
      },
    },
  },
};

export const ruleUpgradeTelemetryEvents = [flyoutButtonClickEvent, openFlyoutEvent];
