/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core/public';
import {
  NIGHTSHIFT_INVESTIGATION_STARTED_EVENT_TYPE,
  NIGHTSHIFT_INVESTIGATION_VIEWED_EVENT_TYPE,
  investigationStartedEventType,
  investigationViewedEventType,
  type InvestigationStartedProps,
  type InvestigationViewedProps,
} from './investigation_events';

export interface InvestigationTelemetry {
  reportInvestigationStarted: (props: InvestigationStartedProps) => void;
  reportInvestigationViewed: (props: InvestigationViewedProps) => void;
}

export const registerInvestigationEvents = (analytics: AnalyticsServiceSetup): void => {
  analytics.registerEventType(investigationStartedEventType);
  analytics.registerEventType(investigationViewedEventType);
};

export const createInvestigationTelemetry = (
  analytics: AnalyticsServiceStart
): InvestigationTelemetry => ({
  reportInvestigationStarted: (props) =>
    analytics.reportEvent<InvestigationStartedProps>(
      NIGHTSHIFT_INVESTIGATION_STARTED_EVENT_TYPE,
      props
    ),
  reportInvestigationViewed: (props) =>
    analytics.reportEvent<InvestigationViewedProps>(
      NIGHTSHIFT_INVESTIGATION_VIEWED_EVENT_TYPE,
      props
    ),
});
