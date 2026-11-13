/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENTS_ALERT_SOURCE,
  type SignificantEvent,
} from '@kbn/significant-events-schema';
import type { EsClient } from '@kbn/scout-oblt';

export const RULE_EVENTS_INDEX = '.rule-events';
const ALERT_ACTIONS_INDEX = '.alert-actions';

/** Stored event fields a caller can override when seeding directly into `.rule-events`. */
type SeedSignificantEventData = Partial<
  Pick<SignificantEvent, 'title' | 'summary' | 'confidence' | 'causal_features' | 'blast_radius'>
>;

/** Indexes a significant event straight into `.rule-events`, the way the alerting v2 executor stores it. */
export const seedSignificantEvent = async (
  esClient: EsClient,
  eventId: string,
  data: SeedSignificantEventData = {}
): Promise<void> => {
  const now = new Date().toISOString();
  const { title = 'Seeded significant event', ...eventData } = data;
  await esClient.index({
    index: RULE_EVENTS_INDEX,
    op_type: 'create',
    refresh: true,
    document: {
      '@timestamp': now,
      scheduled_timestamp: now,
      type: 'alert',
      source: SIGNIFICANT_EVENTS_ALERT_SOURCE,
      space_id: 'default',
      status: 'breached',
      severity: 'high',
      group_hash: eventId,
      rule: { id: eventId, version: 1 },
      alert: { id: eventId, status: 'active' },
      data: { event_id: eventId, title, source_ids: [], ...eventData },
    },
  });
};

export const deleteSignificantEvent = async (
  esClient: EsClient,
  eventId: string
): Promise<void> => {
  await esClient.deleteByQuery({
    index: RULE_EVENTS_INDEX,
    // Status updates are written with a hashed `group_hash`, so match on the event id instead.
    query: { term: { 'data.event_id': eventId } },
    refresh: true,
    ignore_unavailable: true,
  });
  // Operator status changes are alert actions keyed by the seeded alert id.
  await esClient.deleteByQuery({
    index: ALERT_ACTIONS_INDEX,
    query: { term: { alert_id: eventId } },
    refresh: true,
    ignore_unavailable: true,
  });
};
