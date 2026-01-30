/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidEsqlEvaluation, getEuidEsqlDocumentsContainsIdFilter } from './esql';

const normalize = (s: string) =>
  s
    .split(/\n/)
    .map((line) => line.replace(/\s{2,}/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');

describe('getEuidEsqlDocumentsContainsIdFilter', () => {
  it('returns single field condition for generic (one required field)', () => {
    const result = getEuidEsqlDocumentsContainsIdFilter('generic');

    const expected = '(entity.id IS NOT NULL AND entity.id != "")';
    expect(result).toBe(expected);
  });

  it('returns OR of required fields for host', () => {
    const result = getEuidEsqlDocumentsContainsIdFilter('host');

    const expected =
      '(host.entity.id IS NOT NULL AND host.entity.id != "") OR (host.id IS NOT NULL AND host.id != "") OR (host.name IS NOT NULL AND host.name != "") OR (host.hostname IS NOT NULL AND host.hostname != "")';
    expect(result).toBe(expected);
  });
});

describe('getEuidEsqlEvaluation', () => {
  it('returns field IS NOT NULL AND field != "" for non-calculated identity (generic)', () => {
    const result = getEuidEsqlEvaluation('generic');

    const expected = 'CONCAT("generic:", entity.id)';
    expect(normalize(result)).toBe(normalize(expected));
  });

  it('returns full CONCAT(type:, CASE(...), NULL) for calculated identity (host)', () => {
    const result = getEuidEsqlEvaluation('host');

    const expected = `CONCAT("host:", CASE((host.entity.id IS NOT NULL AND host.entity.id != ""), host.entity.id,
                      (host.id IS NOT NULL AND host.id != ""), host.id,
                      (host.name IS NOT NULL AND host.name != "" AND host.domain IS NOT NULL AND host.domain != ""), CONCAT(host.name, ".", host.domain),
                      (host.hostname IS NOT NULL AND host.hostname != "" AND host.domain IS NOT NULL AND host.domain != ""), CONCAT(host.hostname, ".", host.domain),
                      (host.name IS NOT NULL AND host.name != ""), host.name,
                      (host.hostname IS NOT NULL AND host.hostname != ""), host.hostname, NULL))`;
    expect(normalize(result)).toBe(normalize(expected));
  });
});
