/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryClient } from '@kbn/react-query';
import type { FormData, ValidationFunc, ValidationFuncArg } from '../../../../../shared_imports';
import type { FieldValueQueryBar } from '../../../../rule_creation_ui/components/query_bar_field';
import { esqlQueryValidatorFactory } from './esql_query_validator_factory';
import { ESQL_ERROR_CODES } from './error_codes';

jest.mock('@kbn/esql-utils', () => ({
  getESQLQueryColumns: jest.fn().mockResolvedValue([{ id: '_id' }]),
}));
jest.mock('../../../../../common/lib/kibana');

describe('esqlQueryValidator', () => {
  describe('ES|QL query syntax', () => {
    it.each([['incorrect syntax'], ['from test* metadata']])(
      'reports incorrect syntax in "%s"',
      (esqlQuery) =>
        expect(
          createValidator()({
            value: createEsqlQueryFieldValue(esqlQuery),
          } as EsqlQueryValidatorArgs)
        ).resolves.toMatchObject({
          code: ESQL_ERROR_CODES.INVALID_SYNTAX,
        })
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
    ])('succeeds validation for correct syntax in "%s"', (esqlQuery) =>
      expect(
        createValidator()({
          value: createEsqlQueryFieldValue(esqlQuery),
        } as EsqlQueryValidatorArgs)
      ).resolves.toBeUndefined()
    );
  });
});

type EsqlQueryValidatorArgs = ValidationFuncArg<FormData, FieldValueQueryBar>;

function createValidator(): ValidationFunc<FormData, string, FieldValueQueryBar> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });

  return esqlQueryValidatorFactory({ queryClient });
}

function createEsqlQueryFieldValue(esqlQuery: string): Readonly<FieldValueQueryBar> {
  return { query: { query: esqlQuery, language: 'esql' }, filters: [], saved_id: null };
}
