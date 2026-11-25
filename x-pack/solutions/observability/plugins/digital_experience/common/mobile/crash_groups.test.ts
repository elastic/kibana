/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CRASH_DELAY_MS, crashEvents, withCrashFingerprint } from './crash_groups';

const START = Date.parse('2021-01-18T12:00:00.000Z');
const END = Date.parse('2021-01-18T13:00:00.000Z');

describe('crashEvents', () => {
  const { query, params } = crashEvents({
    serviceName: 'ride-ios',
    osName: 'iOS',
    release: '8.5.0',
    start: START,
    end: END,
  }).toRequest();

  it('reads the crash events of the logs indices only', () => {
    expect(query).toContain('FROM logs-*.otel-* |');
    expect(query).not.toContain('traces-');
    expect(query).toContain('WHERE event_name IN ("app.crash", "crash")');
  });

  it('keeps the crashes that happened in the range, by the earlier of their two times', () => {
    expect(query).toContain(
      'EVAL crash_time = LEAST(@timestamp, COALESCE(TO_DATETIME(observed_timestamp), @timestamp))'
    );
    expect(query).toContain(
      'WHERE crash_time >= TO_DATETIME(?crash_start) AND crash_time < TO_DATETIME(?crash_end)'
    );
    expect(params).toEqual([
      { service_name: 'ride-ios' },
      { os_name: 'iOS' },
      { release: '8.5.0' },
      { crash_start: '2021-01-18T12:00:00.000Z' },
      { crash_end: '2021-01-18T13:00:00.000Z' },
    ]);
  });

  it('lets the timestamp filter reach a day past the range, for crashes sent on the next launch', () => {
    expect(CRASH_DELAY_MS).toBe(24 * 60 * 60 * 1000);
  });
});

describe('withCrashFingerprint', () => {
  it('adds the fingerprint of each crash', () => {
    const { query } = withCrashFingerprint(
      crashEvents({ serviceName: 'ride-ios', start: START, end: END })
    ).toRequest();

    expect(query).toContain('| EVAL fingerprint = COALESCE(`attributes.exception.fingerprint`');
  });
});
