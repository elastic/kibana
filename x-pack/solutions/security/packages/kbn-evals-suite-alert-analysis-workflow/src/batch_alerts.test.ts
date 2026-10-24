/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_ANALYSIS_EVAL_BATCHES,
  RUN_TAG_PLACEHOLDER,
  buildBatchAlerts,
  resolveBatchAlertId,
} from './batch_alerts';
import { uniqueMarkers } from './batch_verdicts';

/** The workflow's `consts.batch_size`; a batch of exactly this many alerts is one model call. */
const WORKFLOW_BATCH_SIZE = 50;
const RUN_TAG = 'ab12cd34';

const batchById = (id: string) => {
  const batch = ALERT_ANALYSIS_EVAL_BATCHES.find((candidate) => candidate.id === id);
  if (!batch) {
    throw new Error(`missing batch ${id}`);
  }
  return batch;
};

/** Number of character positions at which two equal-length strings differ. */
const hammingDistance = (a: string, b: string): number => {
  if (a.length !== b.length) {
    return Number.POSITIVE_INFINITY;
  }
  return [...a].filter((char, index) => char !== b[index]).length;
};

describe('multi-alert batch fixtures', () => {
  it('has a batch of exactly batch_size alerts and a batch of about ten', () => {
    expect(batchById('aa-eval-batch-50').alerts).toHaveLength(WORKFLOW_BATCH_SIZE);
    expect(batchById('aa-eval-batch-10').alerts).toHaveLength(10);
  });

  it('has a near-duplicate batch whose pair differs only in per-alert identity', () => {
    const batch = batchById('aa-eval-batch-near-dup');
    const [first, second] = buildBatchAlerts(batch, RUN_TAG);
    // The signal the model reasons on: rule, event and signature/parent evidence. Per-alert
    // identity (id, host, user, binary name, timestamp, entity ids) legitimately differs.
    const SIGNAL_KEY =
      /^(kibana\.alert\.(rule\.(name|description|severity|risk_score|threat)|severity|risk_score|reason)|event\.(kind|category|type|code|outcome)|process\.(code_signature|parent)\.)/;
    const strip = (doc: Record<string, unknown>) =>
      JSON.stringify(
        Object.fromEntries(Object.entries(doc).filter(([key]) => SIGNAL_KEY.test(key)))
      );
    expect(first.doc['kibana.alert.rule.uuid']).toBe(second.doc['kibana.alert.rule.uuid']);
    expect(first.doc['kibana.alert.rule.name']).toBe(second.doc['kibana.alert.rule.name']);
    expect(first.doc['process.code_signature.trusted']).toBe(
      second.doc['process.code_signature.trusted']
    );
    expect(first.expected).toBe(second.expected);
    expect(first.id).not.toBe(second.id);
    expect(first.doc['host.name']).not.toBe(second.doc['host.name']);
    expect(strip(first.doc)).toBe(strip(second.doc));
  });

  it('has an id-collision batch whose ids differ by 1-2 hex digits and whose labels differ', () => {
    const batch = batchById('aa-eval-batch-id-collision');
    const alerts = buildBatchAlerts(batch, RUN_TAG);
    expect(batch.nearCollisionPairs.length).toBeGreaterThanOrEqual(2);
    batch.nearCollisionPairs.forEach(([left, right]) => {
      const distance = hammingDistance(
        resolveBatchAlertId(left, RUN_TAG),
        resolveBatchAlertId(right, RUN_TAG)
      );
      expect(distance).toBeGreaterThanOrEqual(1);
      expect(distance).toBeLessThanOrEqual(2);
    });
    // Every id still ends in a well-formed hex block, like a real alert uuid fragment.
    alerts.forEach((alert) => expect(alert.id).toMatch(/-[0-9a-f]{8}$/));
    // A swap between the two closest ids must change the golden label, so it costs accuracy too.
    const [closeLeft, closeRight] = batch.nearCollisionPairs[0].map((id) =>
      alerts.find((alert) => alert.id === resolveBatchAlertId(id, RUN_TAG))
    );
    expect(closeLeft?.expected).not.toBe(closeRight?.expected);
  });

  it.each(ALERT_ANALYSIS_EVAL_BATCHES.map((batch) => [batch.id, batch] as const))(
    '%s: one rule per batch, unique ids, labels from known archetypes',
    (_batchId, batch) => {
      const alerts = buildBatchAlerts(batch, RUN_TAG);
      const ruleUuids = new Set(alerts.map((alert) => alert.doc['kibana.alert.rule.uuid']));
      expect(ruleUuids.size).toBe(1);
      expect(new Set(alerts.map((alert) => alert.id)).size).toBe(alerts.length);
      alerts.forEach((alert) => {
        expect(alert.id).not.toContain(RUN_TAG_PLACEHOLDER);
        expect(['true_positive', 'false_positive']).toContain(alert.expected);
        expect(alert.doc['kibana.alert.uuid']).toBe(alert.id);
      });
      // Both classes are present, so a constant answer cannot score well on accuracy.
      const positives = alerts.filter((alert) => alert.expected === 'true_positive').length;
      expect(positives).toBeGreaterThan(0);
      expect(positives).toBeLessThan(alerts.length);
    }
  );

  it('gives every alert at least one marker that no other alert in its batch shares', () => {
    ALERT_ANALYSIS_EVAL_BATCHES.forEach((batch) => {
      const alerts = buildBatchAlerts(batch, RUN_TAG);
      uniqueMarkers(alerts).forEach(({ id, markers }) => {
        expect({ id, hasMarker: markers.length > 0 }).toEqual({ id, hasMarker: true });
      });
    });
  });

  it('uses a different run tag for a different run', () => {
    const batch = batchById('aa-eval-batch-10');
    const first = buildBatchAlerts(batch, 'aaaaaaaa');
    const second = buildBatchAlerts(batch, 'bbbbbbbb');
    expect(first[0].id).not.toBe(second[0].id);
    expect(first[0].doc['kibana.alert.rule.uuid']).not.toBe(
      second[0].doc['kibana.alert.rule.uuid']
    );
  });
});
