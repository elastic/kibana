/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FULL_HASH_RANGE } from './hash_ranges';
import {
  MOBILE_SESSION_ATTRIBUTE_FIELDS,
  MOBILE_SESSION_ATTRIBUTE_GROUPS,
  mobileSessionEvents,
  mobileSessionSummaryQuery,
} from './mobile_summary_queries';
import { attributeColumn, changedSessionIdsQuery } from './summary_queries';

const WINDOW = { changedFrom: '2026-11-10T10:00:00.000Z', changedTo: '2026-11-10T10:01:00.000Z' };
const REBUILD = { changedTo: WINDOW.changedTo, rebuildFrom: '2026-11-09T10:00:00.000Z' };

const LATE_CRASH =
  'NOT COALESCE(event_name IN ("app.crash", "crash") AND TO_DATETIME(observed_timestamp) < @timestamp - 24 hours, false)';

describe('mobileSessionEvents', () => {
  it('reads the EDOT Android and EDOT iOS events by SDK name, as Android’s language is java', () => {
    const events = mobileSessionEvents('changed_from', 'changed_to');

    expect(events).toContain('telemetry.sdk.name IN ("android", "iOS")');
    expect(events).not.toContain('telemetry.sdk.language');
    expect(events).toContain('@timestamp >= ?changed_from AND @timestamp < ?changed_to');
    expect(events).toContain('attributes.session.id IS NOT NULL');
  });

  it('leaves out crashes sent more than the longest session after they happened', () => {
    expect(mobileSessionEvents('changed_from', 'changed_to')).toContain(LATE_CRASH);
  });

  it('finds the changed sessions with the same filter', () => {
    const { query } = changedSessionIdsQuery(WINDOW, FULL_HASH_RANGE, mobileSessionEvents);

    expect(query).toContain('telemetry.sdk.name IN ("android", "iOS")');
    expect(query).toContain(LATE_CRASH);
  });
});

describe('mobileSessionSummaryQuery', () => {
  const { query, params } = mobileSessionSummaryQuery(REBUILD, ['a', 'b"c']);

  it('rebuilds the sessions from their events since the rebuild start', () => {
    expect(query).toMatch(/^SET unmapped_fields = "NULLIFY";/);
    expect(query).toContain('@timestamp >= ?rebuild_from AND @timestamp < ?changed_to');
    expect(query).toContain('attributes.session.id IN ("a", "b\\"c")');
    expect(query).toContain(
      'BY service = resource.attributes.service.name, session = attributes.session.id'
    );
    expect(query).toContain('LIMIT 10000');
    expect(params).toEqual([
      { rebuild_from: REBUILD.rebuildFrom },
      { changed_to: REBUILD.changedTo },
    ]);
  });

  it('times a crash when it happened, which EDOT iOS only sends on the next launch', () => {
    expect(query).toContain(
      'EVAL event_time = CASE(is_crash, COALESCE(TO_DATETIME(observed_timestamp), @timestamp), @timestamp)'
    );
    expect(query).toContain('start_time = MIN(event_time)');
    expect(query).toContain('end_time = MAX(event_time)');
  });

  it('counts crashes, screen views, taps and HTTP requests', () => {
    expect(query).toContain('is_crash = event IN ("app.crash", "crash")');
    expect(query).toContain('is_screen_view = COALESCE(scope.name == "UIViewController", false)');
    expect(query).toContain('crash_count = COUNT(*) WHERE is_crash');
    expect(query).toContain('screen_view_count = COUNT(*) WHERE is_screen_view');
    expect(query).toContain('tap_count = COUNT(*) WHERE event == "app.widget.click"');
    expect(query).toContain('http_request_count = ');
    expect(query).toContain('http_failed_request_count = ');
  });

  it('reads every attribute of the groups, and drops the raw columns', () => {
    Object.keys(MOBILE_SESSION_ATTRIBUTE_FIELDS).forEach((attribute) =>
      expect(query).toContain(`${attributeColumn(attribute)} = `)
    );
    expect(Object.values(MOBILE_SESSION_ATTRIBUTE_GROUPS).flat().sort()).toEqual(
      Object.keys(MOBILE_SESSION_ATTRIBUTE_FIELDS).sort()
    );
    expect(query).toContain('resource.attributes.device.model.identifier');
    expect(query).toContain('| DROP raw_*');
  });

  it('caps the rows at a lower cluster limit', () => {
    expect(mobileSessionSummaryQuery(REBUILD, ['a'], 1_000).query).toContain('LIMIT 1000');
  });
});
