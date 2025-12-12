/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildESQLWithKQLQuery, esqlResponseToRecords } from './esql';

describe('buildESQLWithKQLQuery', () => {
  it('returns the original ESQL query if there are parse errors', () => {
    const esql = 'INVALID QUERY';
    const kqlQuery = 'host.name: "test"';
    const result = buildESQLWithKQLQuery(esql, kqlQuery);
    expect(result).toBe(esql);
  });

  it('returns the original ESQL query if kqlQuery is undefined', () => {
    const esql = 'from logs';
    const kqlQuery = undefined;
    const result = buildESQLWithKQLQuery(esql, kqlQuery);
    expect(result).toBe(esql);
  });

  it('returns the original ESQL query if kqlQuery is an empty string', () => {
    const esql = 'from logs';
    const kqlQuery = '';
    const result = buildESQLWithKQLQuery(esql, kqlQuery);
    expect(result).toBe(esql);
  });

  it('adds a KQL WHERE clause to the ESQL query', () => {
    const esql = 'from logs';
    const kqlQuery = 'host.name: "test"';
    const result = buildESQLWithKQLQuery(esql, kqlQuery);
    expect(result).toContain('WHERE KQL("host.name: \\"test\\"")');
  });
});

describe('esqlResponseToRecords', () => {
  it('returns an empty array if the response is undefined', () => {
    const result = esqlResponseToRecords(undefined);
    expect(result).toEqual([]);
  });

  it('converts ESQL response to records', () => {
    const response = {
      columns: [
        { name: 'field1', type: '' },
        { name: 'field2', type: '' },
      ],
      values: [
        ['value1', 'value2'],
        ['value3', 'value4'],
      ],
    };
    const result = esqlResponseToRecords(response);
    expect(result).toEqual([
      { field1: 'value1', field2: 'value2' },
      { field1: 'value3', field2: 'value4' },
    ]);
  });
});
