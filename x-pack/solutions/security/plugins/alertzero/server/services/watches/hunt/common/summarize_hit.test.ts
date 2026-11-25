/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUMMARIZE_HIT_SOURCE_FIELDS, summarizeHit } from './summarize_hit';

const MAX_SAMPLE_EVENT_CHARS = 2048;

describe('summarizeHit', () => {
  it('reads dotted keys, as alerts store them', () => {
    expect(
      summarizeHit({
        index: '.alerts-security.alerts-default',
        id: 'alert-1',
        source: { 'kibana.alert.rule.name': 'Suspicious AssumeRole', 'host.name': 'web-01' },
      })
    ).toBe('rule="Suspicious AssumeRole" host=web-01');
  });

  it('reads nested objects, as raw telemetry stores them', () => {
    expect(
      summarizeHit({
        index: 'logs-aws.cloudtrail-default',
        id: 'event-1',
        source: { event: { action: 'AssumeRole' }, user: { name: 'svc-deploy' } },
      })
    ).toBe('action=AssumeRole user=svc-deploy');
  });

  it('falls back to the envelope when no digested field is present', () => {
    expect(summarizeHit({ index: 'logs-aws.cloudtrail-default', id: 'event-1', source: {} })).toBe(
      '_index=logs-aws.cloudtrail-default _id=event-1'
    );
  });

  it.each([
    ['event.action', { event: { action: 'x'.repeat(10_000) } }],
    ['kibana.alert.rule.name', { 'kibana.alert.rule.name': 'x'.repeat(10_000) }],
  ])(
    'bounds the digest when a document carries a very long %s, so it cannot inflate the Tier 2 prompt',
    (_field, source) => {
      const summary = summarizeHit({ index: 'logs-aws.cloudtrail-default', id: 'event-1', source });

      expect(summary).toHaveLength(MAX_SAMPLE_EVENT_CHARS);
    }
  );

  it('leaves a digest inside the bound untouched', () => {
    const summary = summarizeHit({
      index: 'logs-aws.cloudtrail-default',
      id: 'event-1',
      source: { event: { action: 'AssumeRole' } },
    });

    expect(summary).toBe('action=AssumeRole');
  });

  it('reads every field SUMMARIZE_HIT_SOURCE_FIELDS projects, so a search can request just those', () => {
    // A field the digest reads but the constant omits would be projected away and
    // silently disappear from every digest, so pin the two together.
    const source = Object.fromEntries(
      SUMMARIZE_HIT_SOURCE_FIELDS.map((field) => [field, `value-of-${field}`])
    );

    const summary = summarizeHit({ index: 'logs-aws.cloudtrail-default', id: 'event-1', source });

    // `event.dataset` wins over `data_stream.dataset`, which is its fallback.
    const read = SUMMARIZE_HIT_SOURCE_FIELDS.filter((field) => field !== 'data_stream.dataset');
    for (const field of read) {
      expect(summary).toContain(`value-of-${field}`);
    }
  });

  it('falls back to data_stream.dataset when event.dataset is absent', () => {
    const summary = summarizeHit({
      index: 'logs-aws.cloudtrail-default',
      id: 'event-1',
      source: { data_stream: { dataset: 'aws.cloudtrail' } },
    });

    expect(summary).toBe('dataset=aws.cloudtrail');
  });
});
