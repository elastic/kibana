/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { InventoryDefinitionError } from './errors';
import { assertParses } from './parse_guard';
import { buildProbeQuery } from './probe_query';

jest.mock('./parse_guard', () => {
  const actual = jest.requireActual('./parse_guard');
  return { ...actual, assertParses: jest.fn(actual.assertParses) };
});

describe('buildProbeQuery', () => {
  beforeEach(() => {
    jest.mocked(assertParses).mockClear();
  });

  it.each(['metrics-kubeletstatsreceiver.otel-default', 'metrics-*-*'])(
    'probes %s for a time-series index with no parameters',
    (indexPattern) => {
      const query = buildProbeQuery(indexPattern);
      const { esql, params } = query;

      expect(query).toMatchSnapshot();
      expect(esql.split('\n')).toEqual([
        'SET unmapped_fields="nullify";',
        `TS ${indexPattern}`,
        '| KEEP `@timestamp`',
        '| LIMIT 0',
      ]);
      expect(params).toEqual([]);
      expect(Parser.parse(esql).errors).toEqual([]);
      expect(assertParses).toHaveBeenCalledTimes(1);
      expect(assertParses).toHaveBeenCalledWith(esql);
    }
  );

  it('rejects an unsafe index pattern before assembling a query', () => {
    expect(() => buildProbeQuery('metrics-* | DROP x')).toThrow(InventoryDefinitionError);
    expect(assertParses).not.toHaveBeenCalled();
  });
});
