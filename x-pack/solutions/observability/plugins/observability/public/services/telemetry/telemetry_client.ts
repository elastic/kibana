/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ITelemetryClient } from './types';
import { TelemetryEventTypes } from './types';

export class TelemetryClient implements ITelemetryClient {
  constructor(private readonly analytics: AnalyticsServiceStart) {}

  reportRelatedAlertsLoaded(count: number): void {
    this.analytics.reportEvent(TelemetryEventTypes.RELATED_ALERTS_LOADED, {
      count,
    });
  }

  reportAlertDetailsPageView(ruleType: string): void {
    this.analytics.reportEvent(TelemetryEventTypes.ALERT_DETAILS_PAGE_VIEW, {
      rule_type: ruleType,
    });
  }

  reportAlertAddedToCase(newCaseCreated: boolean, from: string, ruleTypeId: string): void {
    this.analytics.reportEvent(TelemetryEventTypes.ALERT_ADDED_TO_CASE, {
      new_case_created: newCaseCreated,
      from,
      rule_type_id: ruleTypeId,
    });
  }

  reportLinkedDashboardViewed(ruleTypeId: string): void {
    this.analytics.reportEvent(TelemetryEventTypes.LINKED_DASHBOARD_VIEW, {
      rule_type_id: ruleTypeId,
    });
  }

  reportSuggestedDashboardAdded(ruleTypeId: string): void {
    this.analytics.reportEvent(TelemetryEventTypes.SUGGESTED_DASHBOARD_ADDED, {
      rule_type_id: ruleTypeId,
    });
  }
}
