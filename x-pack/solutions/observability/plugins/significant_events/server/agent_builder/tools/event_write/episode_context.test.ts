/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractRuleUuidsFromEvents,
  makeIdentity,
  mergeEpisodeContext,
  mergeSignalsLatestPerRule,
  preserveStableNarrative,
} from './episode_context';
import type {
  BlastRadiusEntry,
  CausalFeature,
  SignificantEvent,
  SignalEntry,
} from '@kbn/significant-events-schema';
import { MAX_SIGNAL_DESCRIPTION_LENGTH } from '@kbn/significant-events-schema';

const TS_EARLIER = '2024-01-01T00:00:00.000Z';
const TS_SUBMITTED = '2024-01-02T00:00:00.000Z';
const TS_LATER = '2024-01-03T00:00:00.000Z';

describe('makeIdentity', () => {
  it('is stable regardless of stream and rule ordering', () => {
    const a = makeIdentity({ streamNames: ['logs.b', 'logs.a'], ruleUuids: ['rule-2', 'rule-1'] });
    const b = makeIdentity({ streamNames: ['logs.a', 'logs.b'], ruleUuids: ['rule-1', 'rule-2'] });
    expect(a).toBe(b);
  });

  it('produces different identities for different stream sets (exact-set matching)', () => {
    const single = makeIdentity({ streamNames: ['logs.a'], ruleUuids: ['rule-1'] });
    const withExtra = makeIdentity({ streamNames: ['logs.a', 'logs.z'], ruleUuids: ['rule-1'] });
    expect(single).not.toBe(withExtra);
  });

  it('produces different identities for different rule sets', () => {
    const a = makeIdentity({ streamNames: ['logs.app'], ruleUuids: ['rule-1'] });
    const b = makeIdentity({ streamNames: ['logs.app'], ruleUuids: ['rule-2'] });
    expect(a).not.toBe(b);
  });

  it('produces a consistent key for empty stream_names', () => {
    const a = makeIdentity({ streamNames: [], ruleUuids: ['rule-1'] });
    const b = makeIdentity({ streamNames: [], ruleUuids: ['rule-1'] });
    const withStream = makeIdentity({ streamNames: ['logs.app'], ruleUuids: ['rule-1'] });
    expect(a).toBe(b);
    expect(a).not.toBe(withStream);
  });

  it('produces distinct keys for zero-rule-uuid events on different streams (zero-rule)', () => {
    const streamA = makeIdentity({ streamNames: ['stream-a'], ruleUuids: [] });
    const streamB = makeIdentity({ streamNames: ['stream-b'], ruleUuids: [] });
    expect(streamA).not.toBe(streamB);
  });

  it("produces distinct keys for ['A'] vs ['A','B'] (widened-episode regression guard)", () => {
    const single = makeIdentity({ streamNames: ['A'], ruleUuids: ['rule-1'] });
    const widened = makeIdentity({ streamNames: ['A', 'B'], ruleUuids: ['rule-1'] });
    expect(single).not.toBe(widened);
  });

  it('prevents pipe-join collision between ["a|b"] and ["a", "b"]', () => {
    const joined = makeIdentity({ streamNames: ['a|b'], ruleUuids: [] });
    const split = makeIdentity({ streamNames: ['a', 'b'], ruleUuids: [] });
    expect(joined).not.toBe(split);
  });
});

describe('mergeSignalsLatestPerRule', () => {
  const makeSignal = (ruleUuid: string): SignalEntry => ({
    type: 'detection',
    stream_name: 'logs.test',
    description: 'Test signal',
    verdict: 'confirms',
    metadata: {
      detection_id: `det-${ruleUuid}`,
      rule_uuid: ruleUuid,
      change_point_type: 'spike',
      p_value: 0.01,
    },
  });

  it('keeps the submitted signal when no prior docs exist', () => {
    const signal = makeSignal('rule-1');
    expect(mergeSignalsLatestPerRule([], [signal], TS_SUBMITTED)).toEqual([signal]);
  });

  it('uses the most recent version of a signal per rule_uuid — submitted wins when newer', () => {
    const priorSignal = makeSignal('rule-1');
    const submittedSignal = makeSignal('rule-1');
    const result = mergeSignalsLatestPerRule(
      [{ '@timestamp': TS_EARLIER, signals: [priorSignal] }],
      [submittedSignal],
      TS_SUBMITTED
    );
    expect(result).toHaveLength(1);
    expect((result[0] as Extract<SignalEntry, { type: 'detection' }>).metadata.detection_id).toBe(
      submittedSignal.metadata.detection_id
    );
  });

  it('carries forward prior rules that are absent in the submitted batch', () => {
    const rule1 = makeSignal('rule-1');
    const rule2 = makeSignal('rule-2');
    const result = mergeSignalsLatestPerRule(
      [{ '@timestamp': TS_EARLIER, signals: [rule1] }],
      [rule2],
      TS_SUBMITTED
    );
    expect(result).toHaveLength(2);
    const ruleUuids = result.map(
      (s) => (s as Extract<SignalEntry, { type: 'detection' }>).metadata.rule_uuid
    );
    expect(ruleUuids).toContain('rule-1');
    expect(ruleUuids).toContain('rule-2');
  });

  it('carries forward a non-blocking signal unchanged', () => {
    const nonBlocking = { ...makeSignal('rule-1'), verdict: 'refutes' as const };
    const result = mergeSignalsLatestPerRule(
      [{ '@timestamp': TS_EARLIER, signals: [nonBlocking] }],
      [makeSignal('rule-2')],
      TS_SUBMITTED
    );

    expect(result).toContainEqual(nonBlocking);
  });

  it('prefers prior doc when its timestamp is newer than submitted', () => {
    const priorSignal = makeSignal('rule-1');
    const result = mergeSignalsLatestPerRule(
      [{ '@timestamp': TS_LATER, signals: [priorSignal] }],
      [makeSignal('rule-1')],
      TS_EARLIER
    );
    expect((result[0] as Extract<SignalEntry, { type: 'detection' }>).metadata.detection_id).toBe(
      priorSignal.metadata.detection_id
    );
  });

  it('normalizes a legacy carried-forward description before persistence', () => {
    const legacySignal = {
      ...makeSignal('rule-1'),
      description: 'x'.repeat(MAX_SIGNAL_DESCRIPTION_LENGTH + 1),
    };
    const result = mergeSignalsLatestPerRule(
      [{ '@timestamp': TS_EARLIER, signals: [legacySignal] }],
      [],
      TS_SUBMITTED
    );

    expect(result[0].description).toHaveLength(MAX_SIGNAL_DESCRIPTION_LENGTH);
  });
});

describe('mergeEpisodeContext', () => {
  const makeCausal = (featureId: string, subtype = 'service'): CausalFeature => ({
    feature_id: featureId,
    type: 'entity',
    subtype,
    name: featureId,
  });
  const makeBlast = (featureId: string, subtype = 'service'): BlastRadiusEntry => ({
    type: 'entity',
    subtype,
    feature_id: featureId,
    name: featureId,
    stream_name: 'logs.test',
  });

  it('unions stream_names across all docs and sorts them', () => {
    const { streamNames } = mergeEpisodeContext(
      [{ '@timestamp': TS_EARLIER, stream_names: ['logs.b'] }],
      { stream_names: ['logs.a'], causal_features: [], blast_radius: [] },
      TS_SUBMITTED
    );
    expect(streamNames).toEqual(['logs.a', 'logs.b']);
  });

  it('causal classification beats blast for the same feature_id', () => {
    const { causalFeatures, blastRadius } = mergeEpisodeContext(
      [
        {
          '@timestamp': TS_EARLIER,
          stream_names: ['logs.app'],
          blast_radius: [makeBlast('feat-1')],
          causal_features: [] as CausalFeature[],
        },
      ],
      { stream_names: ['logs.app'], causal_features: [makeCausal('feat-1')], blast_radius: [] },
      TS_SUBMITTED
    );
    expect(causalFeatures.map((f) => f.feature_id)).toContain('feat-1');
    expect(blastRadius.map((f) => f.feature_id)).not.toContain('feat-1');
  });

  it('keeps the most recent version of a blast_radius entry per feature_id', () => {
    const { blastRadius } = mergeEpisodeContext(
      [
        {
          '@timestamp': TS_EARLIER,
          stream_names: ['logs.app'],
          blast_radius: [makeBlast('feat-1')],
          causal_features: [] as CausalFeature[],
        },
      ],
      { stream_names: ['logs.app'], causal_features: [], blast_radius: [makeBlast('feat-1')] },
      TS_SUBMITTED
    );
    expect(blastRadius).toHaveLength(1);
    expect(blastRadius[0].feature_id).toBe('feat-1');
  });

  // Dedup is keyed on feature_id alone, so when two episodes disagree about a feature's
  // classification the newest document silently wins. Deliberate: the copied type/subtype is a
  // point-in-time snapshot of the knowledge indicator, so the latest write is the freshest read.
  it('takes the classification from the newest document when episodes disagree', () => {
    const { causalFeatures, blastRadius } = mergeEpisodeContext(
      [
        {
          '@timestamp': TS_EARLIER,
          stream_names: ['logs.app'],
          blast_radius: [makeBlast('feat-blast', 'database')],
          causal_features: [makeCausal('feat-causal', 'database')],
        },
      ],
      {
        stream_names: ['logs.app'],
        causal_features: [makeCausal('feat-causal', 'service')],
        blast_radius: [makeBlast('feat-blast', 'service')],
      },
      TS_SUBMITTED
    );
    expect(causalFeatures).toEqual([makeCausal('feat-causal', 'service')]);
    expect(blastRadius).toEqual([makeBlast('feat-blast', 'service')]);
  });
});

describe('preserveStableNarrative', () => {
  const makeDetection = (ruleUuid: string): SignalEntry => ({
    type: 'detection',
    stream_name: 'logs.app',
    description: `Signal for ${ruleUuid}`,
    verdict: 'confirms',
    metadata: {
      detection_id: `det-${ruleUuid}`,
      rule_uuid: ruleUuid,
      change_point_type: 'spike',
      p_value: 0.01,
    },
  });

  const makeLatest = (ruleUuids: string[]): SignificantEvent =>
    ({
      '@timestamp': TS_EARLIER,
      event_uuid: 'event-uuid',
      event_id: 'event-id',
      status: 'open',
      severity: '60-high',
      stream_names: ['logs.app'],
      signals: ruleUuids.map(makeDetection),
      title: 'Stored title',
      symptom_hypothesis: 'Stored hypothesis',
      summary: 'Stored summary',
      confidence: 0.8,
    } as SignificantEvent);

  it('returns undefined when latestEvent is missing', () => {
    expect(preserveStableNarrative(['rule-1'], undefined, ['rule-1'])).toBeUndefined();
  });

  it('freezes stored narrative when submitted UUIDs are empty', () => {
    const latest = makeLatest(['rule-1']);
    expect(preserveStableNarrative([], latest, extractRuleUuidsFromEvents([latest]))).toEqual({
      title: 'Stored title',
      symptom_hypothesis: 'Stored hypothesis',
      narrativePreserved: true,
    });
  });

  it('freezes when submitted UUIDs are a subset of stored rules', () => {
    const latest = makeLatest(['rule-1', 'rule-2']);
    expect(
      preserveStableNarrative(['rule-1'], latest, extractRuleUuidsFromEvents([latest]))
    ).toEqual({
      title: 'Stored title',
      symptom_hypothesis: 'Stored hypothesis',
      narrativePreserved: true,
    });
  });

  it('freezes a historically known rule missing from the latest snapshot', () => {
    const older = makeLatest(['rule-legacy']);
    const latest = makeLatest(['rule-current']);
    latest.title = 'Latest title';
    latest.symptom_hypothesis = 'Latest hypothesis';

    expect(
      preserveStableNarrative(['rule-legacy'], latest, extractRuleUuidsFromEvents([older, latest]))
    ).toEqual({
      title: 'Latest title',
      symptom_hypothesis: 'Latest hypothesis',
      narrativePreserved: true,
    });
  });

  it('does not freeze when a submitted UUID is new to the episode', () => {
    const latest = makeLatest(['rule-1']);
    expect(
      preserveStableNarrative(['rule-new'], latest, extractRuleUuidsFromEvents([latest]))
    ).toBeUndefined();
  });

  it('omits symptom_hypothesis from freeze when stored event has none', () => {
    const latest = {
      '@timestamp': TS_EARLIER,
      event_uuid: 'event-uuid',
      event_id: 'event-id',
      status: 'open' as const,
      severity: '60-high' as const,
      stream_names: ['logs.app'],
      signals: [makeDetection('rule-1')],
      title: 'Stored title',
      summary: 'Stored summary',
      confidence: 0.8,
    } as SignificantEvent;

    const result = preserveStableNarrative(
      ['rule-1'],
      latest,
      extractRuleUuidsFromEvents([latest])
    );
    expect(result).toEqual({ title: 'Stored title', narrativePreserved: true });
    expect(result).not.toHaveProperty('symptom_hypothesis');
  });
});
