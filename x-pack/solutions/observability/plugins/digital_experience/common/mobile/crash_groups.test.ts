/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CRASH_DELAY_MS,
  crashEvents,
  withCrashBreakdown,
  withCrashFingerprint,
  withCrashGroup,
  withCrashGroupReleases,
  withCrashGroupStats,
  withLatestCrash,
} from './crash_groups';

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

describe('withCrashGroupStats', () => {
  const query = withCrashGroupStats(
    withCrashFingerprint(crashEvents({ serviceName: 'ride-ios', start: START, end: END }))
  ).print('basic');

  it('counts each group by installations, events and sessions', () => {
    expect(query).toContain('users = COUNT_DISTINCT(`resource.attributes.app.installation.id`)');
    expect(query).toContain('events = COUNT(*)');
    expect(query).toContain('sessions = COUNT_DISTINCT(`attributes.session.id`)');
  });

  it('reads the first and last crash, and the latest type and message, by crash time', () => {
    expect(query).toContain('first_seen = MIN(crash_time), last_seen = MAX(crash_time)');
    expect(query).toContain('message = LAST(`attributes.exception.message`, crash_time)');
    expect(query).toContain('first_release = FIRST(`service.version`, crash_time)');
    expect(query).toContain('last_release = LAST(`service.version`, crash_time)');
    expect(query).toContain('BY fingerprint');
  });

  it('ranks by affected users, so a crash loop on one device does not lead', () => {
    expect(query).toContain('| SORT users DESC, events DESC | LIMIT 100');
  });
});

describe('withCrashGroupReleases', () => {
  it('lists the releases of the listed groups only', () => {
    const query = withCrashGroupReleases(
      withCrashFingerprint(crashEvents({ serviceName: 'ride-ios', start: START, end: END })),
      ['abc', 'd"e']
    ).print('basic');

    expect(query).toContain('| WHERE fingerprint IN ("abc", "d\\"e")');
    expect(query).toContain(
      '| STATS releases = VALUES(`service.version`) BY fingerprint | LIMIT 2'
    );
  });
});

describe('crash group detail', () => {
  const groupCrashes = () =>
    withCrashGroup(
      withCrashFingerprint(crashEvents({ serviceName: 'ride-ios', start: START, end: END })),
      'abc'
    );

  it("keeps the group's crashes, the fingerprint as a param", () => {
    const { query, params } = groupCrashes().toRequest();

    expect(query).toContain('| WHERE fingerprint == ?fingerprint');
    expect(params).toEqual(expect.arrayContaining([{ fingerprint: 'abc' }]));
  });

  it('reads the latest crash with its stack trace and session', () => {
    expect(withLatestCrash(groupCrashes()).print('basic')).toContain(
      '| SORT crash_time DESC | LIMIT 1 | EVAL exception_type = `attributes.exception.type`, message = `attributes.exception.message`, stacktrace = `attributes.exception.stacktrace`, release = `service.version`, session_id = `attributes.session.id` | KEEP crash_time, exception_type, message, stacktrace, release, session_id'
    );
  });

  it('counts the crashes per release, OS version and device model', () => {
    expect(withCrashBreakdown(groupCrashes(), 'releases').print('basic')).toContain(
      '| STATS count = COUNT(*) BY value = `service.version` | SORT count DESC, value | LIMIT 1000'
    );
    expect(withCrashBreakdown(groupCrashes(), 'osVersions').print('basic')).toContain(
      'BY value = `resource.attributes.os.version`'
    );
    expect(withCrashBreakdown(groupCrashes(), 'deviceModels').print('basic')).toContain(
      'BY value = COALESCE(`resource.attributes.device.model.name`, `resource.attributes.device.model.identifier`)'
    );
  });
});
