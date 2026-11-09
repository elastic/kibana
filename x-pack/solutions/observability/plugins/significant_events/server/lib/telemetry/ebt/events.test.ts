/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  agentBuilderKnowledgeIndicatorCreatedEventType,
  agentToolEventCreateEventType,
  agentToolEventInvestigationAttachEventType,
  agentToolEventSearchEventType,
  agentToolEventStatusUpdateEventType,
  agentToolEventWriteEventType,
  agentToolKiIdentificationStartedEventType,
  detectionScanEventType,
  discoveryTriggeredEventType,
  knowledgeIndicatorEventsGeneratedEventType,
  knowledgeIndicatorFeaturesIdentifiedEventType,
  onboardingScheduledEventType,
} from './events';

const isOptional = (field: { _meta?: { optional?: boolean } }) => field._meta?.optional === true;

describe('EBT event types', () => {
  it.each([
    agentBuilderKnowledgeIndicatorCreatedEventType,
    agentToolEventCreateEventType,
    agentToolEventInvestigationAttachEventType,
    agentToolEventSearchEventType,
    agentToolEventStatusUpdateEventType,
    agentToolEventWriteEventType,
    agentToolKiIdentificationStartedEventType,
    detectionScanEventType,
    discoveryTriggeredEventType,
    knowledgeIndicatorEventsGeneratedEventType,
    knowledgeIndicatorFeaturesIdentifiedEventType,
    onboardingScheduledEventType,
  ])('$eventType registers the CPS target context', ({ schema }) => {
    expect(isOptional(schema.space_id)).toBe(false);
    expect(isOptional(schema.target_cluster_scope)).toBe(true);
    expect(isOptional(schema.target_cluster_ids)).toBe(true);
    expect(isOptional(schema.target_cluster_ids_complete)).toBe(true);
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
