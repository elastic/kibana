/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAlertEventDataSchema } from '@kbn/alerting-v2-schemas';
import {
  SIGNIFICANT_EVENTS_ALERT_SOURCE,
  SIGNIFICANT_EVENTS_SEVERITY_MAP,
  SIGNIFICANT_EVENTS_STATUS_MAP,
  type BlastRadiusEntry,
  type CausalFeature,
  type SignalEntry,
  type SignificantEventInvestigation,
} from '@kbn/significant-events-schema';
import type { SignificantEvent } from './data_stream';
import { toRuleEvent } from './to_rule_event';

const createSignificantEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_uuid: 'uuid-1',
  event_id: 'stable-id-1',
  status: 'open',
  stream_names: ['logs.test'],
  title: 'API gateway — upstream connection refused',
  summary: 'Connection refused on port 8080.',
  severity: '60-high',
  confidence: 0.75,
  ...overrides,
});

const getEventData = (event: SignificantEvent): Record<string, unknown> => {
  const { data } = toRuleEvent(event);
  expect(data).toBeDefined();
  return data as Record<string, unknown>;
};

const SIGNAL: SignalEntry = {
  type: 'detection',
  stream_name: 'logs.test',
  description: 'Connection refused rows found.',
  verdict: 'confirms',
  evidence: { esql_query: 'FROM logs.test | LIMIT 1', result: 'found' },
  metadata: {
    detection_id: 'det-1',
    rule_uuid: 'rule-uuid-1',
    rule_name: 'Connection refused',
    change_point_type: 'spike',
    p_value: 0.01,
    severity_score: 75,
  },
};

const CAUSAL_FEATURE: CausalFeature = {
  feature_id: 'fi-1',
  name: 'API Gateway',
  stream_name: 'logs.test',
};

const BLAST_RADIUS_ENTRY: BlastRadiusEntry = {
  type: 'entity',
  feature_id: 'fi-2',
  name: 'Payment Service',
  stream_name: 'logs.test',
};

const INVESTIGATION: SignificantEventInvestigation = {
  workflow_execution_id: 'wf-exec-1',
  started_at: '2026-01-01T01:00:00.000Z',
};

describe('toRuleEvent', () => {
  describe('complete output shape', () => {
    it('maps a minimal event to the full CreateAlertEventData shape', () => {
      expect(toRuleEvent(createSignificantEvent())).toEqual({
        fingerprint: 'stable-id-1',
        source: 'significant_events',
        timestamp: '2026-01-01T00:00:00.000Z',
        severity: 'high',
        alert_status: 'active',
        data: {
          event_id: 'stable-id-1',
          rule_name: 'API gateway — upstream connection refused',
          title: 'API gateway — upstream connection refused',
          summary: 'Connection refused on port 8080.',
          confidence: 0.75,
          stream_names: ['logs.test'],
        },
      });
    });

    it('maps a maximal event to the full CreateAlertEventData shape', () => {
      const event = createSignificantEvent({
        event_id: 'ev-max',
        '@timestamp': '2026-03-01T09:00:00.000Z',
        status: 'dismissed',
        severity: '80-critical',
        confidence: 0.9,
        symptom_hypothesis: 'Pool exhausted.',
        assessment_note: 'False alarm.',
        stream_names: ['logs.app', 'logs.db'],
        signals: [SIGNAL],
        causal_features: [CAUSAL_FEATURE],
        blast_radius: [BLAST_RADIUS_ENTRY],
        investigations: [INVESTIGATION],
        workflow_execution_id: 'wf-1',
        conversation_id: 'conv-1',
      });

      expect(toRuleEvent(event)).toEqual({
        fingerprint: 'ev-max',
        source: 'significant_events',
        timestamp: '2026-03-01T09:00:00.000Z',
        severity: 'critical',
        alert_status: 'inactive',
        data: {
          event_id: 'ev-max',
          rule_name: 'API gateway — upstream connection refused',
          title: 'API gateway — upstream connection refused',
          summary: 'Connection refused on port 8080.',
          confidence: 0.9,
          stream_names: ['logs.app', 'logs.db'],
          symptom_hypothesis: 'Pool exhausted.',
          assessment_note: 'False alarm.',
          signals: [SIGNAL],
          causal_features: [CAUSAL_FEATURE],
          blast_radius: [BLAST_RADIUS_ENTRY],
          investigations: [INVESTIGATION],
          workflow_execution_id: 'wf-1',
          conversation_id: 'conv-1',
        },
      });
    });
  });

  describe('schema validity', () => {
    it('passes createAlertEventDataSchema for a minimal event', () => {
      expect(() =>
        createAlertEventDataSchema.parse(toRuleEvent(createSignificantEvent()))
      ).not.toThrow();
    });

    it('passes createAlertEventDataSchema for a maximal event', () => {
      const event = createSignificantEvent({
        symptom_hypothesis: 'Database pool exhausted.',
        assessment_note: 'Kept open — active failure confirmed.',
        signals: [SIGNAL],
        causal_features: [CAUSAL_FEATURE],
        blast_radius: [BLAST_RADIUS_ENTRY],
        investigations: [INVESTIGATION],
        workflow_execution_id: 'wf-exec-0',
        conversation_id: 'conv-1',
      });

      expect(() => createAlertEventDataSchema.parse(toRuleEvent(event))).not.toThrow();
    });
  });

  describe('identity fields', () => {
    it('sets fingerprint to event_id', () => {
      const event = createSignificantEvent({ event_id: 'my-stable-id' });
      expect(toRuleEvent(event).fingerprint).toBe('my-stable-id');
    });

    it('sets source to SIGNIFICANT_EVENTS_ALERT_SOURCE', () => {
      expect(toRuleEvent(createSignificantEvent()).source).toBe(SIGNIFICANT_EVENTS_ALERT_SOURCE);
    });

    it('source does not start with "elastic"', () => {
      expect(SIGNIFICANT_EVENTS_ALERT_SOURCE.startsWith('elastic')).toBe(false);
    });

    it('sets timestamp to @timestamp', () => {
      const event = createSignificantEvent({ '@timestamp': '2026-06-15T12:00:00.000Z' });
      expect(toRuleEvent(event).timestamp).toBe('2026-06-15T12:00:00.000Z');
    });
  });

  describe('severity mapping', () => {
    it.each(Object.entries(SIGNIFICANT_EVENTS_SEVERITY_MAP))('maps %s → %s', (input, expected) => {
      const event = createSignificantEvent({ severity: input as SignificantEvent['severity'] });
      expect(toRuleEvent(event).severity).toBe(expected);
    });

    it('covers all SEVERITY_OPTIONS (exhaustiveness enforced by typed Record)', () => {
      expect(Object.keys(SIGNIFICANT_EVENTS_SEVERITY_MAP)).toEqual(
        expect.arrayContaining(['80-critical', '60-high', '40-medium', '20-low'])
      );
    });
  });

  describe('status mapping', () => {
    it.each(Object.entries(SIGNIFICANT_EVENTS_STATUS_MAP))('maps %s → %s', (input, expected) => {
      const event = createSignificantEvent({ status: input as SignificantEvent['status'] });
      expect(toRuleEvent(event).alert_status).toBe(expected);
    });

    it('covers all SIGNIFICANT_EVENT_STATUS_OPTIONS (exhaustiveness enforced by typed Record)', () => {
      expect(Object.keys(SIGNIFICANT_EVENTS_STATUS_MAP)).toEqual(
        expect.arrayContaining(['open', 'closed', 'dismissed'])
      );
    });
  });

  describe('data field', () => {
    it('contains required keys for a minimal event', () => {
      const data = getEventData(createSignificantEvent());
      expect(data).toMatchObject({
        event_id: 'stable-id-1',
        rule_name: 'API gateway — upstream connection refused',
        title: 'API gateway — upstream connection refused',
        summary: 'Connection refused on port 8080.',
        confidence: 0.75,
        stream_names: ['logs.test'],
      });
    });

    it('does not include status in data', () => {
      expect(getEventData(createSignificantEvent({ status: 'dismissed' }))).not.toHaveProperty(
        'status'
      );
    });

    it('does not include severity in data', () => {
      expect(getEventData(createSignificantEvent({ severity: '80-critical' }))).not.toHaveProperty(
        'severity'
      );
    });

    it('does not include event_uuid in data', () => {
      expect(getEventData(createSignificantEvent({ event_uuid: 'uuid-x' }))).not.toHaveProperty(
        'event_uuid'
      );
    });

    it('does not include previous_event_uuid in data', () => {
      expect(
        getEventData(createSignificantEvent({ previous_event_uuid: 'prev-uuid' }))
      ).not.toHaveProperty('previous_event_uuid');
    });

    it('omits optional fields when absent', () => {
      const data = getEventData(createSignificantEvent());
      for (const key of [
        'symptom_hypothesis',
        'assessment_note',
        'signals',
        'causal_features',
        'blast_radius',
        'investigations',
        'workflow_execution_id',
        'conversation_id',
      ]) {
        expect(data).not.toHaveProperty(key);
      }
    });

    it('includes optional fields when present', () => {
      const event = createSignificantEvent({
        symptom_hypothesis: 'Pool exhausted.',
        assessment_note: 'Kept open.',
        workflow_execution_id: 'wf-1',
        conversation_id: 'conv-1',
      });
      expect(getEventData(event)).toMatchObject({
        symptom_hypothesis: 'Pool exhausted.',
        assessment_note: 'Kept open.',
        workflow_execution_id: 'wf-1',
        conversation_id: 'conv-1',
      });
    });

    it('passes arrays of objects through intact', () => {
      const signals: SignalEntry[] = [SIGNAL];
      const causalFeatures: CausalFeature[] = [CAUSAL_FEATURE];
      const blastRadius: BlastRadiusEntry[] = [BLAST_RADIUS_ENTRY];
      const investigations: SignificantEventInvestigation[] = [INVESTIGATION];

      const data = getEventData(
        createSignificantEvent({
          signals,
          causal_features: causalFeatures,
          blast_radius: blastRadius,
          investigations,
        })
      );

      expect(data.signals).toEqual(signals);
      expect(data.causal_features).toEqual(causalFeatures);
      expect(data.blast_radius).toEqual(blastRadius);
      expect(data.investigations).toEqual(investigations);
    });

    it('has exactly the required keys for a minimal event', () => {
      const data = getEventData(createSignificantEvent());
      expect(Object.keys(data).sort()).toEqual(
        ['confidence', 'event_id', 'rule_name', 'stream_names', 'summary', 'title'].sort()
      );
    });

    it('has exactly the full key set for a maximal event', () => {
      const data = getEventData(
        createSignificantEvent({
          symptom_hypothesis: 'x',
          assessment_note: 'y',
          signals: [SIGNAL],
          causal_features: [CAUSAL_FEATURE],
          blast_radius: [BLAST_RADIUS_ENTRY],
          investigations: [INVESTIGATION],
          workflow_execution_id: 'wf-1',
          conversation_id: 'conv-1',
        })
      );
      expect(Object.keys(data).sort()).toEqual(
        [
          'assessment_note',
          'blast_radius',
          'causal_features',
          'confidence',
          'conversation_id',
          'event_id',
          'investigations',
          'rule_name',
          'signals',
          'stream_names',
          'summary',
          'symptom_hypothesis',
          'title',
          'workflow_execution_id',
        ].sort()
      );
    });

    it('stays well under the 100-key data cap', () => {
      const data = getEventData(
        createSignificantEvent({
          symptom_hypothesis: 'x',
          assessment_note: 'y',
          signals: [SIGNAL],
          causal_features: [CAUSAL_FEATURE],
          blast_radius: [BLAST_RADIUS_ENTRY],
          investigations: [INVESTIGATION],
          workflow_execution_id: 'wf-1',
          conversation_id: 'conv-1',
        })
      );
      expect(Object.keys(data).length).toBeLessThan(100);
    });
  });
});
