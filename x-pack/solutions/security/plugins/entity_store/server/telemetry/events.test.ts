/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import { ENTITY_STORE_KI_LOOP_EVENT, createReportEvent, registerTelemetry } from './events';

describe('Knowledge Indicators loop telemetry event', () => {
  // Smoke-test the registration + reporter pipeline. Type-safety catches
  // schema/payload-shape mismatches at compile time; this suite catches
  // runtime drift (event missing from the registration list, payload
  // not matching the schema field set, etc.) which TypeScript cannot.
  const buildAnalytics = () =>
    ({
      registerEventType: jest.fn(),
      reportEvent: jest.fn(),
    } as unknown as jest.Mocked<AnalyticsServiceSetup>);

  it('registers the KI loop event with the analytics service', () => {
    const analytics = buildAnalytics();
    registerTelemetry(analytics);

    const registered = (analytics.registerEventType as jest.Mock).mock.calls.map(
      ([event]) => event.eventType
    );
    expect(registered).toContain(ENTITY_STORE_KI_LOOP_EVENT.eventType);
  });

  it('declares schema fields for every metric the loop helper reports', () => {
    const fields = Object.keys(ENTITY_STORE_KI_LOOP_EVENT.schema);
    // Exact list documented here so adding/removing a metric in the loop
    // forces an explicit decision about the telemetry surface.
    expect(fields.sort()).toEqual(
      [
        'namespace',
        'groupsTotal',
        'groupsProcessed',
        'groupsSucceeded',
        'groupsFailed',
        'groupsSkippedNoIndexPatterns',
        'groupsSkippedMissingSubtype',
        'groupsTruncated',
      ].sort()
    );
  });

  it('forwards a fully populated KI loop payload through the type-safe reporter', () => {
    const analytics = buildAnalytics();
    const reporter = createReportEvent(analytics);

    reporter.reportEvent(ENTITY_STORE_KI_LOOP_EVENT, {
      namespace: 'default',
      groupsTotal: 5,
      groupsProcessed: 3,
      groupsSucceeded: 2,
      groupsFailed: 1,
      groupsSkippedNoIndexPatterns: 1,
      groupsSkippedMissingSubtype: 1,
      groupsTruncated: 0,
    });

    expect(analytics.reportEvent).toHaveBeenCalledWith(
      ENTITY_STORE_KI_LOOP_EVENT.eventType,
      expect.objectContaining({
        namespace: 'default',
        groupsTotal: 5,
        groupsSucceeded: 2,
      })
    );
  });
});
