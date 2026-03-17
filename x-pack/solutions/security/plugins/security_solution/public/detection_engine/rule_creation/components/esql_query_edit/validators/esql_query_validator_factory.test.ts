/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryClient } from '@kbn/react-query';
import { getESQLQueryColumns } from '@kbn/esql-utils';
import type { FormData, ValidationFunc, ValidationFuncArg } from '../../../../../shared_imports';
import type { FieldValueQueryBar } from '../../../../rule_creation_ui/components/query_bar_field';
import { esqlQueryValidatorFactory } from './esql_query_validator_factory';
import { ESQL_ERROR_CODES } from './error_codes';

jest.mock('@kbn/esql-utils', () => ({
  getESQLQueryColumns: jest.fn().mockResolvedValue([{ id: '_id' }]),
}));
jest.mock('../../../../../common/lib/kibana');

const getESQLQueryColumnsMock = getESQLQueryColumns as jest.Mock;

describe('esqlQueryValidator', () => {
  beforeEach(() => {
    getESQLQueryColumnsMock.mockResolvedValue([{ id: '_id' }]);
  });

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

  describe('_id column validation for non-aggregating queries', () => {
    it('succeeds when _id column is present in response', () => {
      getESQLQueryColumnsMock.mockResolvedValue([{ id: '_id' }, { id: 'agent.name' }]);

      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test* metadata _id'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toBeUndefined();
    });

    it('returns MISSING_ID_FIELD warning when _id column is absent', () => {
      getESQLQueryColumnsMock.mockResolvedValue([{ id: 'agent.name' }]);

      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test* metadata _id | drop _id'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toMatchObject({
        code: ESQL_ERROR_CODES.MISSING_ID_FIELD,
      });
    });

    it('returns MISSING_ID_FIELD warning when columns are empty', () => {
      getESQLQueryColumnsMock.mockResolvedValue([]);

      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test*'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toMatchObject({
        code: ESQL_ERROR_CODES.MISSING_ID_FIELD,
      });
    });

    it('succeeds for non-aggregating query without explicit metadata when injection adds _id', () => {
      getESQLQueryColumnsMock.mockResolvedValue([{ id: '_id' }, { id: 'agent.name' }]);

      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test*'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toBeUndefined();
    });
  });

  describe('_id column validation for aggregating queries', () => {
    it('succeeds when _id is absent for aggregating query', () => {
      getESQLQueryColumnsMock.mockResolvedValue([{ id: 'count' }]);

      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test* | stats count() by agent.name'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toBeUndefined();
    });
  });

  describe('when getESQLQueryColumns fails', () => {
    it('returns a validation error', () => {
      jest.spyOn(console, 'error').mockReturnValue();

      getESQLQueryColumnsMock.mockRejectedValue(new Error('some error'));

      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test* metadata _id'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toMatchObject({
        code: ESQL_ERROR_CODES.INVALID_ESQL,
        message: 'Error validating ES|QL: "some error"',
      });
    });
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
