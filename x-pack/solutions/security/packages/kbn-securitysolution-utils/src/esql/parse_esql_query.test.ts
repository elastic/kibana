/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseEsqlQuery } from './parse_esql_query';

describe('parseEsqlQuery', () => {
  describe('ES|QL query syntax', () => {
    it.each([['incorrect syntax'], ['from test* metadata']])(
      'detects incorrect syntax in "%s"',
      (esqlQuery) => {
        const result = parseEsqlQuery(esqlQuery);
        expect(result.errors.length).toEqual(1);
        expect(result).toMatchObject({
          isEsqlQueryAggregating: false,
        });
      }
    );

    it.each([
      ['from test* metadata _id'],
      [
        'FROM kibana_sample_data_logs | STATS total_bytes = SUM(bytes) BY host | WHERE total_bytes > 200000 | SORT total_bytes DESC | LIMIT 10',
      ],
      [
        `from packetbeat* metadata
        _id
        | limit 100`,
      ],
      [
        `FROM kibana_sample_data_logs |
         STATS total_bytes = SUM(bytes) BY host |
         WHERE total_bytes > 200000 |
         SORT total_bytes DESC |
         LIMIT 10`,
      ],
    ])('parses correctly valid syntax in "%s"', (esqlQuery) => {
      const result = parseEsqlQuery(esqlQuery);
      expect(result.errors.length).toEqual(0);
    });
  });

  describe('aggregating query detection', () => {
    it('detects non-aggregating query', () => {
      expect(parseEsqlQuery('from test*')).toEqual({
        errors: [],
        isEsqlQueryAggregating: false,
      });
    });

    it('detects aggregating query', () => {
      expect(parseEsqlQuery('from test* | stats c = count(*) by fieldA')).toEqual({
        errors: [],
        isEsqlQueryAggregating: true,
      });
    });
  });
});
