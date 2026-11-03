/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { EbtTelemetryService } from './service';
import {
  agentToolEventCreateEventType,
  agentToolEventInvestigationAttachEventType,
  agentToolEventStatusUpdateEventType,
  agentToolEventWriteEventType,
} from './events';

const isOptional = (field: { _meta?: { optional?: boolean } }) => field._meta?.optional === true;

describe('EBT event types', () => {
  it('registers the same event types', () => {
    const registerEventType = jest.fn();
    new EbtTelemetryService().setup({ registerEventType } as unknown as AnalyticsServiceSetup);

    expect(registerEventType.mock.calls.map(([{ eventType }]) => eventType).sort()).toEqual([
      'significant-events-agent-builder-knowledge-indicator-created',
      'significant-events-agent-tool-event-create',
      'significant-events-agent-tool-event-investigation-attach',
      'significant-events-agent-tool-event-search',
      'significant-events-agent-tool-event-status-update',
      'significant-events-agent-tool-event-write',
      'significant-events-agent-tool-ki-identification-started',
      'significant-events-detection-scan',
      'significant-events-features-identified',
      'significant-events-onboarding-scheduled',
      'significant-events-significant-events-discovery-triggered',
      'significant-events-significant-events-queries-generated',
    ]);
  });

  it.each([agentToolEventStatusUpdateEventType, agentToolEventInvestigationAttachEventType])(
    '$eventType requires the full alert identity on an event about an existing alert',
    ({ schema }) => {
      const { alert_source: source, fingerprint, space_id: spaceId } = schema;

      [source, fingerprint, spaceId].forEach((field) => expect(isOptional(field)).toBe(false));
    }
  );

  it.each([agentToolEventCreateEventType, agentToolEventWriteEventType])(
    '$eventType lets a failed create omit the series identity',
    ({ schema }) => {
      const {
        alert_source: source,
        space_id: spaceId,
        fingerprint,
        group_hash: groupHash,
      } = schema;

      [source, spaceId].forEach((field) => expect(isOptional(field)).toBe(false));
      [fingerprint, groupHash].forEach((field) => expect(isOptional(field)).toBe(true));
    }
  );
});
