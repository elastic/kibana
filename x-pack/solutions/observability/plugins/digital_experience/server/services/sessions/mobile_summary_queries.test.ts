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

    expect(events).toContain('(resource.attributes.telemetry.sdk.name IN ("android", "iOS")');
    expect(events).not.toContain('telemetry.sdk.language == "java"');
    expect(events).toContain('@timestamp >= ?changed_from AND @timestamp < ?changed_to');
    expect(events).toContain('attributes.session.id IS NOT NULL');
  });

  it('also reads them by the Elastic distro and a mobile OS, once the SDKs report upstream names', () => {
    expect(mobileSessionEvents('changed_from', 'changed_to')).toContain(
      'OR (resource.attributes.telemetry.distro.name == "elastic"\n      AND resource.attributes.os.name IN ("Android", "iOS", "iPadOS")'
    );
  });

  it('leaves EDOT Browser out of the distro and OS match, as it is the Elastic distro too', () => {
    expect(mobileSessionEvents('changed_from', 'changed_to')).toContain(
      'AND (resource.attributes.telemetry.sdk.language IS NULL OR resource.attributes.telemetry.sdk.language != "webjs"))'
    );
  });

  it('leaves out crashes sent more than the longest session after they happened', () => {
    expect(mobileSessionEvents('changed_from', 'changed_to')).toContain(LATE_CRASH);
  });

  it('finds the changed sessions with the same filter', () => {
    const { query } = changedSessionIdsQuery(WINDOW, FULL_HASH_RANGE, mobileSessionEvents);

    expect(query).toContain('resource.attributes.telemetry.sdk.name IN ("android", "iOS")');
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

  it('times a crash when it happened, the earlier of its two times', () => {
    expect(query).toContain(
      'EVAL event_time = CASE(is_crash, LEAST(@timestamp, COALESCE(TO_DATETIME(observed_timestamp), @timestamp)), @timestamp)'
    );
    expect(query).toContain('start_time = MIN(event_time)');
    expect(query).toContain('end_time = MAX(event_time)');
  });

  it('ranks crashes below every other event for the attributes, as the next launch sends them', () => {
    expect(query).toContain('attribute_rank = CASE(is_crash, @timestamp - 100 years, @timestamp)');
    Object.keys(MOBILE_SESSION_ATTRIBUTE_GROUPS).forEach((group) =>
      expect(query).toMatch(new RegExp(`seen_${group} = CASE\\([^\\n]*, attribute_rank, null\\)`))
    );
    expect(query).not.toContain(', @timestamp, null)');
  });

  it('counts crashes, screen views, taps and HTTP requests', () => {
    expect(query).toContain('is_crash = event IN ("app.crash", "crash")');
    expect(query).toContain('is_screen_view = COALESCE(scope.name == "UIViewController", false)');
    expect(query).toContain('crash_count = COUNT(*) WHERE is_crash');
    expect(query).toContain('screen_view_count = COUNT(*) WHERE is_screen_view');
    expect(query).toContain('tap_count = COUNT(*) WHERE event == "app.widget.click"');
    expect(query).toContain('http_request_count = COUNT_DISTINCT(span_id) WHERE is_http_request');
    expect(query).toContain(
      'http_failed_request_count = COUNT_DISTINCT(span_id) WHERE is_http_request'
    );
  });

  it('reads every attribute of the groups, and drops the raw columns', () => {
    Object.keys(MOBILE_SESSION_ATTRIBUTE_FIELDS).forEach((attribute) =>
      expect(query).toContain(`${attributeColumn(attribute)} = `)
    );
    expect(Object.values(MOBILE_SESSION_ATTRIBUTE_GROUPS).flat().sort()).toEqual(
      Object.keys(MOBILE_SESSION_ATTRIBUTE_FIELDS).sort()
    );
    expect(query).toContain('resource.attributes.device.model.identifier');
    expect(query).not.toContain('device.model.name');
    expect(query).toContain('| DROP raw_*');
  });

  it('reads the build id from service.build when EDOT iOS uses its legacy names', () => {
    expect(query).toMatch(
      /attribute_app_build_id = COALESCE\([^\n]*raw_resource_attributes_app_build_id[^\n]*raw_resource_attributes_service_build/
    );
  });

  it('caps the rows at a lower cluster limit', () => {
    expect(mobileSessionSummaryQuery(REBUILD, ['a'], 1_000).query).toContain('LIMIT 1000');
  });
});
