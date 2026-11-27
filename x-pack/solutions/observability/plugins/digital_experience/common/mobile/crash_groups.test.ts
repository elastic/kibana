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
  withCrashGroupHistory,
  withCrashGroupStats,
  withCrashTypes,
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
      'EVAL crash_time = LEAST(@timestamp, CASE(TO_DATETIME(observed_timestamp) + 24 hours >= @timestamp, TO_DATETIME(observed_timestamp), @timestamp))'
    );
    expect(query).toContain(
      'WHERE crash_time >= TO_DATETIME(?crash_start) AND crash_time < TO_DATETIME(?crash_end)'
    );
    expect(params).toEqual([
      { service_name: 'ride-ios' },
      { os_name: 'iOS' },
      { crash_start: '2021-01-18T12:00:00.000Z' },
      { crash_end: '2021-01-18T13:00:00.000Z' },
      { release: '8.5.0' },
    ]);
  });

  it("filters by the release that crashed, and reads the OS that crashed: an iOS report's own, else the resource's", () => {
    expect(query).toContain(
      '| EVAL crash_release = CASE(`attributes.exception.stacktrace` LIKE "Incident Identifier:*", REPLACE(`attributes.exception.stacktrace`, "(?s)^(?:.*?\\\\nVersion: +(\\\\S+))?.*$", "$1"), NULL), crash_os_version = CASE(`attributes.exception.stacktrace` LIKE "Incident Identifier:*", REPLACE(`attributes.exception.stacktrace`, "(?s)^(?:.*?\\\\nOS Version: +[^0-9\\\\n]*([0-9][0-9.]*).*|.*)$", "$1"), NULL) | EVAL crash_release = COALESCE(CASE(crash_release != "", crash_release, NULL), CASE(`service.version` != "", `service.version`, NULL)), crash_os_version = COALESCE(CASE(crash_os_version != "", crash_os_version, NULL), CASE(`resource.attributes.os.version` != "", `resource.attributes.os.version`, NULL)) | WHERE crash_release == ?release'
    );
    expect(query).not.toContain('WHERE `service.version` ==');
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

    expect(query).toContain(
      '| EVAL fingerprint = COALESCE(`attributes.elastic.error.grouping_key`'
    );
  });
});

describe('withCrashGroupStats', () => {
  const query = withCrashGroupStats(
    withCrashFingerprint(crashEvents({ serviceName: 'ride-ios', start: START, end: END }))
  ).print('basic');

  it('counts each group by installations, events and sessions', () => {
    // An empty id is none, as the flyout reads an empty session.
    expect(query).toContain(
      'users = COUNT_DISTINCT(CASE(`resource.attributes.app.installation.id` != "", `resource.attributes.app.installation.id`, NULL))'
    );
    expect(query).toContain('events = COUNT(*)');
    expect(query).toContain(
      'sessions = COUNT_DISTINCT(CASE(`attributes.session.id` != "", `attributes.session.id`, NULL))'
    );
  });

  it('reads the first and last crash, and the latest type and message, by crash time', () => {
    expect(query).toContain('first_seen = MIN(crash_time), last_seen = MAX(crash_time)');
    expect(query).toContain('message = LAST(`attributes.exception.message`, crash_time)');
    expect(query).toContain('first_release = FIRST(crash_release, crash_time)');
    expect(query).toContain('last_release = LAST(crash_release, crash_time)');
    expect(query).toContain('BY fingerprint');
    // Stored fingerprints, which can be of any type, so the group's type can't narrow its crashes.
    expect(query).toContain(
      'stored_fingerprints = COUNT(*) WHERE `attributes.elastic.error.grouping_key` IS NOT NULL'
    );
    // EDOT iOS reports, whose fingerprint changes with every build, so they are never marked new.
    expect(query).toContain(
      'ios_reports = COUNT(*) WHERE `attributes.exception.stacktrace` LIKE "Incident Identifier:*"'
    );
  });

  it('ranks by affected users, so a crash loop on one device does not lead', () => {
    expect(query).toContain('| SORT users DESC, events DESC | LIMIT 100');
  });
});

describe('withCrashGroupHistory', () => {
  it('lists the releases and the first crash of the listed groups only', () => {
    const query = withCrashGroupHistory(
      withCrashFingerprint(crashEvents({ serviceName: 'ride-ios', start: START, end: END })),
      ['abc', 'd"e']
    ).print('basic');

    expect(query).toContain('| WHERE fingerprint IN ("abc", "d\\"e")');
    expect(query).toContain(
      // The crashes without a release too, which `VALUES` leaves out, and the lookback's iOS reports.
      '| STATS releases = VALUES(crash_release), unversioned = COUNT(*) WHERE crash_release IS NULL, ios_reports = COUNT(*) WHERE `attributes.exception.stacktrace` LIKE "Incident Identifier:*", first_seen = MIN(crash_time), first_release = FIRST(crash_release, crash_time) BY fingerprint | LIMIT 2'
    );
  });
});

describe('withCrashTypes', () => {
  const crashes = () => crashEvents({ serviceName: 'ride-ios', start: START, end: END });

  it('keeps the crashes of the types, and those with a stored fingerprint, of any type', () => {
    expect(withCrashTypes(crashes(), ['SIGSEGV', 'SIGABRT', 'SIGSEGV']).print('basic')).toContain(
      '| WHERE `attributes.elastic.error.grouping_key` IS NOT NULL OR (`attributes.exception.type` IN ("SIGSEGV", "SIGABRT"))'
    );
  });

  it('keeps the crashes without a type for a group without one, as the fingerprint reads them', () => {
    const query = withCrashTypes(crashes(), ['SIGSEGV', null]).print('basic');

    expect(query).toContain(
      'OR `attributes.exception.type` IS NULL OR `attributes.exception.type` == ""'
    );
    expect(withCrashTypes(crashes(), ['SIGSEGV']).print('basic')).not.toContain(
      '`attributes.exception.type` IS NULL'
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
      '| SORT crash_time DESC | LIMIT 1 | EVAL exception_type = `attributes.exception.type`, message = `attributes.exception.message`, stacktrace = `attributes.exception.stacktrace`, release = crash_release, os_version = crash_os_version, device_model = COALESCE(CASE(`resource.attributes.device.model.name` != "", `resource.attributes.device.model.name`, NULL), CASE(`resource.attributes.device.model.identifier` != "", `resource.attributes.device.model.identifier`, NULL)), session_id = CASE(`attributes.session.id` != "", `attributes.session.id`, NULL), stored_fingerprint = `attributes.elastic.error.grouping_key`, reported_at = @timestamp | KEEP crash_time, reported_at, exception_type, message, stacktrace, release, os_version, device_model, session_id, stored_fingerprint'
    );
  });

  it('counts the crashes per release, OS version and device model, with the total for "Other"', () => {
    // The total is counted before the top values are cut, so "Other" holds every crash they leave out.
    expect(withCrashBreakdown(groupCrashes(), 'releases').print('basic')).toContain(
      '| INLINE STATS total = COUNT(*) | STATS count = COUNT(*), total = MAX(total) BY value = crash_release | SORT count DESC, value | LIMIT 6'
    );
    expect(withCrashBreakdown(groupCrashes(), 'osVersions').print('basic')).toContain(
      'BY value = crash_os_version'
    );
    expect(withCrashBreakdown(groupCrashes(), 'deviceModels').print('basic')).toContain(
      'BY value = COALESCE(CASE(`resource.attributes.device.model.name` != "", `resource.attributes.device.model.name`, NULL), CASE(`resource.attributes.device.model.identifier` != "", `resource.attributes.device.model.identifier`, NULL))'
    );
  });
});
