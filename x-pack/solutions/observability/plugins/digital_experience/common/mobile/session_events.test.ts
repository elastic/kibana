/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sessionEventsBefore } from './session_events';

describe('sessionEventsBefore', () => {
  const { query, params } = sessionEventsBefore({
    serviceName: 'ride-ios',
    sessionId: 'Df831c22-A367',
    before: '2021-01-18T12:30:00.000Z',
    limit: 20,
  }).toRequest();

  it('reads the logs and the traces of the session, by its id as sent or in either case', () => {
    expect(query).toContain('FROM traces-*.otel-*, logs-*.otel-*');
    expect(query).toContain(
      '`attributes.session.id` IN (?session_id, ?session_id_lower, ?session_id_upper)'
    );
    expect(params).toEqual([
      { service_name: 'ride-ios' },
      { session_id: 'Df831c22-A367' },
      { session_id_lower: 'df831c22-a367' },
      { session_id_upper: 'DF831C22-A367' },
      { before: '2021-01-18T12:30:00.000Z' },
    ]);
  });

  it('keeps the latest listed events before the time', () => {
    expect(query).toContain('| WHERE @timestamp < TO_DATETIME(?before)');
    expect(query).toContain('| WHERE event_kind IS NOT NULL |');
    expect(query).toContain('| SORT @timestamp DESC | LIMIT 20');
  });

  it('lists a span an SDK sent twice once, before the limit', () => {
    expect(query).toContain('FROM traces-*.otel-*, logs-*.otel-* METADATA _index, _id |');
    // A span id is only unique within a trace, and a document id within an index.
    expect(query).toContain(
      '| EVAL document_key = CONCAT(_index, "/", _id) | INLINE STATS kept_key = MIN(document_key) BY trace_id, span_id, event_kind | WHERE NOT (event_kind IN ("request", "screen")) OR trace_id IS NULL OR span_id IS NULL OR document_key == kept_key | SORT @timestamp DESC | LIMIT 20'
    );
  });

  it("computes each kind's timeline fields", () => {
    expect(query).toContain(
      'name = COALESCE(CASE(event_kind == "request", `attributes.http.request.method`'
    );
    expect(query).toContain('detail = CASE(event_kind == "request", `attributes.url.full`');
    expect(query).toContain(
      'duration_ms = CASE(event_kind == "request", duration / 1000000.0, NULL)'
    );
  });

  it('lists requests, screens, taps, handled errors and logs', () => {
    expect(query).toContain(
      'kind == "Client" AND `attributes.http.request.method` IS NOT NULL, "request"'
    );
    expect(query).toContain(
      '`scope.name` == "UIViewController" OR name == "elastic.app.screen.load", "screen"'
    );
    expect(query).toContain('event_name IN ("app.widget.click", "app.screen.click"), "tap"');
    expect(query).toContain('event_name == "exception", "error"');
    expect(query).toContain('event_name IS NULL AND severity_text IS NOT NULL, "log"');
  });
});
