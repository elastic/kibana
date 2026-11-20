/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEventsRequestExample } from './events_request_example';

describe('buildEventsRequestExample', () => {
  const NOW = Date.parse('2026-11-20T12:00:00.000Z');
  const lines = buildEventsRequestExample('app-events', NOW).split('\n');

  it('starts with a bulk request to the index', () => {
    expect(lines[0]).toBe('POST app-events/_bulk');
  });

  it('pairs every event with an index action and ends with a new line', () => {
    const body = lines.slice(1, -1);

    expect(lines[lines.length - 1]).toBe('');
    expect(body.filter((_, position) => position % 2 === 0)).toEqual(
      Array(body.length / 2).fill('{ "index": {} }')
    );
  });

  it('dates every event within the hour before now, oldest first', () => {
    const times = lines
      .slice(1, -1)
      .filter((_, position) => position % 2 === 1)
      .map((line) => Date.parse(JSON.parse(line)['@timestamp']));

    expect(times.length).toBeGreaterThan(0);
    expect(times.every((time) => time < NOW && time >= NOW - 60 * 60_000)).toBe(true);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});
