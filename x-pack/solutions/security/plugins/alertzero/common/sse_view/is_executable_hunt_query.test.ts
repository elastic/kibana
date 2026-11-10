/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isExecutableHuntQuery } from './is_executable_hunt_query';

describe('isExecutableHuntQuery', () => {
  it('returns true for an uppercase FROM query', () => {
    expect(isExecutableHuntQuery('FROM logs-* | WHERE host.name == "a"')).toBe(true);
  });

  it('returns true for a lowercase from query', () => {
    expect(isExecutableHuntQuery('from logs-* | where host.name == "a"')).toBe(true);
  });

  it('returns true for a block-comment-led query that still has a FROM command', () => {
    expect(isExecutableHuntQuery('/* Hunts for suspicious logins */\nFROM logs-* | LIMIT 10')).toBe(
      true
    );
  });

  it('returns true for a grounded header plus the real query', () => {
    const esql = `/* Grounded on: process.name, destination.ip */
FROM logs-endpoint.events.process-*
| WHERE destination.ip IS NOT NULL
| LIMIT 100`;
    expect(isExecutableHuntQuery(esql)).toBe(true);
  });

  it('returns false for a placeholder comment that only mentions FROM in its title', () => {
    expect(isExecutableHuntQuery('/* FROM placeholder - replace with the real query */')).toBe(
      false
    );
  });

  it('returns false for a line-comment-only placeholder mentioning FROM', () => {
    expect(isExecutableHuntQuery('// TODO FROM logs-* once grounded')).toBe(false);
  });

  it('returns false for a query whose first command is not FROM', () => {
    expect(isExecutableHuntQuery('ROW x = 1')).toBe(false);
  });

  it('returns false for an unparseable query', () => {
    expect(isExecutableHuntQuery('FROM logs-* | WHERE (')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isExecutableHuntQuery('')).toBe(false);
  });
});
