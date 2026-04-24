/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemReadinessTelemetryEvent } from './types';
import { SiemReadinessEventTypes } from './types';

const siemReadinessTabVisitedEvent: SiemReadinessTelemetryEvent = {
  eventType: SiemReadinessEventTypes.TabVisited,
  schema: {
    tabId: {
      type: 'keyword',
      _meta: {
        description: 'ID of the visited tab (coverage|quality|continuity|retention)',
        optional: false,
      },
    },
  },
};

const siemReadinessIntegrationPopoverOpenedEvent: SiemReadinessTelemetryEvent = {
  eventType: SiemReadinessEventTypes.IntegrationPopoverOpened,
  schema: {
    source: {
      type: 'keyword',
      _meta: {
        description:
          'Context where the popover was opened (data_coverage|all_rules_enabled|all_rules_missing|mitre_attack)',
        optional: false,
      },
    },
  },
};

const siemReadinessIntegrationClickedEvent: SiemReadinessTelemetryEvent = {
  eventType: SiemReadinessEventTypes.IntegrationClicked,
  schema: {
    integrationPackage: {
      type: 'keyword',
      _meta: {
        description: 'Package name of the integration that was clicked',
        optional: false,
      },
    },
    source: {
      type: 'keyword',
      _meta: {
        description:
          'Context where the integration was clicked (data_coverage|all_rules_enabled|all_rules_missing|mitre_attack)',
        optional: false,
      },
    },
  },
};

const siemReadinessRuleViewToggledEvent: SiemReadinessTelemetryEvent = {
  eventType: SiemReadinessEventTypes.RuleViewToggled,
  schema: {
    view: {
      type: 'keyword',
      _meta: {
        description: 'The rule view the user switched to (all_rules|mitre_attack)',
        optional: false,
      },
    },
  },
};

export const siemReadinessTelemetryEvents = [
  siemReadinessTabVisitedEvent,
  siemReadinessIntegrationPopoverOpenedEvent,
  siemReadinessIntegrationClickedEvent,
  siemReadinessRuleViewToggledEvent,
];
