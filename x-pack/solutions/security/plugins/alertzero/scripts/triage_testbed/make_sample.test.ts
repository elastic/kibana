/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Profile } from './generate_alerts';
import { generate } from './generate_alerts';
import type { SampleRecord } from './make_sample';
import { selectSample, filterKinds, summarize } from './make_sample';

// A small day with every kind of alert, building blocks, variants and harmless hash updates.
const profile: Profile = {
  totals: {
    statusSeverityMix: [
      { alerts: 3000, buildingBlock: false, severity: 'low', status: 'open' },
      { alerts: 100, buildingBlock: false, severity: 'low', status: 'closed' },
      { alerts: 900, buildingBlock: false, severity: 'medium', status: 'open' },
      { alerts: 400, buildingBlock: false, severity: 'high', status: 'open' },
      { alerts: 300, buildingBlock: true, severity: 'low', status: 'open' },
    ],
  },
  unkeyedRules: [
    { alerts: 60, rule: 'Okta User Sessions Started from Different Geolocations', severity: 'low' },
    {
      alerts: 50,
      rule: 'GitHub Bot Account Activity from Unmanaged IP Address',
      severity: 'medium',
    },
  ],
};
const params = {
  meanKeySize: 12,
  keySizeSigma: 1.2,
  // Like the real day (17.6% true positives): few true-positive keys.
  falsePositiveKeyShare: 0.9,
  badVariantRate: 0.3,
  hashUpdate: { keyShare: 0.6, laterAlertShare: 0.8, minKeySize: 4 },
  entra: { alerts: 100, keys: 4 },
  bursts: { count: 0 },
  rulesPerSeverity: { low: 14, medium: 8, high: 4, critical: 1 },
  buildingBlockRules: 3,
};
const day = generate({ profile, seed: 5, params });
const records: SampleRecord[] = day.alerts.map((alert, i) => ({ alert, truth: day.truth[i] }));
const options = { records, seed: 1, perRule: 20, truePositiveShare: 0.4, perKey: 3 };
const sample = selectSample(options);
const share = (list: SampleRecord[], fn: (record: SampleRecord) => boolean): number =>
  list.filter(fn).length / list.length;
const isTruePositive = (r: SampleRecord): boolean => r.truth.verdict === 'true_positive';

describe('selectSample', () => {
  it('leaves building-block alerts out, because the worker leaves them out of the analysis it is calibrated for', () => {
    expect(records.some((r) => r.alert._source['kibana.alert.building_block_type'])).toBe(true);
    expect(sample.filter((r) => r.alert._source['kibana.alert.building_block_type'])).toEqual([]);
  });

  it('takes at most `perRule` alerts of a rule, so that a rule is about one model call', () => {
    const perRule = new Map<string, number>();
    sample.forEach((r) => perRule.set(r.truth.ruleUuid, (perRule.get(r.truth.ruleUuid) ?? 0) + 1));

    expect(sample.length).toBeGreaterThan(100);
    expect(Math.max(...perRule.values())).toBeLessThanOrEqual(20);
  });

  it('takes alerts of every kind that the day has', () => {
    const dayKinds = new Set(
      records
        .filter((r) => !r.alert._source['kibana.alert.building_block_type'])
        .map((r) => r.truth.kind)
    );
    const sampleKinds = new Set(sample.map((r) => r.truth.kind));

    expect(dayKinds.size).toBeGreaterThanOrEqual(5);
    expect([...dayKinds].filter((kind) => !sampleKinds.has(kind))).toEqual([]);
  });

  it('has a higher share of true positives than the day, because the calibration needs enough wrong-direction observations', () => {
    const notBlocks = records.filter((r) => !r.alert._source['kibana.alert.building_block_type']);

    expect(share(sample, isTruePositive)).toBeGreaterThan(share(notBlocks, isTruePositive) + 0.1);
    expect(share(sample, isTruePositive)).toBeGreaterThan(0.25);
  });

  it('takes planted variants and harmless hash updates, because the sample must show both', () => {
    expect(sample.filter((r) => r.truth.variant).length).toBeGreaterThan(5);
    expect(sample.filter((r) => r.truth.benign).length).toBeGreaterThan(5);
  });

  it('takes at most `perKey` alerts of a key unless the rule has no other', () => {
    const perKey = new Map<string, number>();
    sample
      .filter((r) => !r.truth.variant && !r.truth.benign)
      .forEach((r) => perKey.set(r.truth.keyId, (perKey.get(r.truth.keyId) ?? 0) + 1));

    expect(Math.max(...perKey.values())).toBeLessThanOrEqual(3);
  });

  it('gives the same sample for the same seed, another for another seed, and keeps the order of the day', () => {
    const again = selectSample(options);
    const other = selectSample({ ...options, seed: 2 });
    const positions = sample.map((r) => records.indexOf(r));

    expect(again.map((r) => r.truth.id)).toEqual(sample.map((r) => r.truth.id));
    expect(other.map((r) => r.truth.id)).not.toEqual(sample.map((r) => r.truth.id));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('counts what the sample holds', () => {
    const summary = summarize(sample);

    expect(summary.alerts).toBe(sample.length);
    expect(summary.truePositives).toBe(sample.filter(isTruePositive).length);
    expect(Object.values(summary.byKind).reduce((sum, k) => sum + k.alerts, 0)).toBe(sample.length);
  });

  it('keeps only the given kinds, in order, and does not change which alerts the sample holds for them', () => {
    const only = filterKinds(sample, ['cloud', 'aggregate']);
    const wanted = sample.filter((r) => ['cloud', 'aggregate'].includes(r.truth.kind));

    expect(only.length).toBeGreaterThan(0);
    expect(only.length).toBeLessThan(sample.length);
    expect(only.map((r) => r.truth.id)).toEqual(wanted.map((r) => r.truth.id));
  });
});
