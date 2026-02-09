/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractFilters } from './extract_filters';

describe('extractFilters', () => {
  it('extracts filters from WHERE commands', () => {
    const query = `FROM logs-*
| WHERE status == "error"
| STATS count = COUNT(*) BY host.name`;

    const filters = extractFilters(query);

    expect(filters).toHaveLength(1);
    expect(filters[0]).toBe('status == "error"');
  });

  it('extracts multiple WHERE filters', () => {
    const query = `FROM logs-*
| WHERE status == "error"
| WHERE level > 3
| STATS count = COUNT(*) BY host.name`;

    const filters = extractFilters(query);

    expect(filters).toHaveLength(2);
    expect(filters[0]).toBe('status == "error"');
    expect(filters[1]).toBe('level > 3');
  });

  it('extracts complex filter expressions', () => {
    const query = `FROM logs-*
| WHERE status == "error" AND level > 3
| STATS count = COUNT(*) BY host.name`;

    const filters = extractFilters(query);

    expect(filters).toHaveLength(1);
    expect(filters[0]).toBe('status == "error" AND level > 3');
  });

  it('returns empty array when no WHERE commands', () => {
    const query = `FROM logs-*
| STATS count = COUNT(*) BY host.name`;

    const filters = extractFilters(query);

    expect(filters).toHaveLength(0);
  });

  it('handles TS command queries', () => {
    const query = `TS metrics-*
| WHERE host.name == "server1"
| STATS avg = AVG(cpu) BY host.name`;

    const filters = extractFilters(query);

    expect(filters).toHaveLength(1);
    expect(filters[0]).toBe('host.name == "server1"');
  });

  it('returns empty array for invalid queries', () => {
    const query = 'this is not valid esql';

    const filters = extractFilters(query);

    expect(filters).toHaveLength(0);
  });
});
