/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient } from '@tanstack/react-query';
import { getESQLQueryColumns } from '@kbn/esql-utils';
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

  describe('METADATA operator validation', () => {
    it.each([
      ['from test*'],
      ['from metadata*'],
      ['from test* | keep metadata'],
      ['from test* | eval x="metadata _id"'],
    ])('reports when METADATA operator is missing in a NON aggregating query "%s"', (esqlQuery) =>
      expect(
        createValidator()({
          value: createEsqlQueryFieldValue(esqlQuery),
        } as EsqlQueryValidatorArgs)
      ).resolves.toMatchObject({
        code: ESQL_ERROR_CODES.ERR_MISSING_ID_FIELD_FROM_RESULT,
      })
    );

    it.each([
      ['from test* metadata _id'],
      ['from test* metadata _id, _index'],
      ['from test* metadata _index, _id'],
      ['from test*  metadata _id '],
      ['from test*    metadata _id '],
      ['from test*  metadata _id | limit 10'],
      [
        `from packetbeat* metadata

        _id
        | limit 100`,
      ],
    ])(
      'succeeds validation when METADATA operator EXISTS in a NON aggregating query "%s"',
      (esqlQuery) =>
        expect(
          createValidator()({
            value: createEsqlQueryFieldValue(esqlQuery),
          } as EsqlQueryValidatorArgs)
        ).resolves.toBeUndefined()
    );

    it('succeeds validation when METADATA operator is missing in an aggregating query "from test* | stats c = count(*) by fieldA"', () =>
      expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test* | stats c = count(*) by fieldA'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toBeUndefined());
  });

  describe('METADATA _id field validation for NON aggregating queries', () => {
    it('reports when METADATA "_id" field is missing', () => {
      getESQLQueryColumnsMock.mockResolvedValue([{ id: 'column1' }, { id: 'column2' }]);

      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test*'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toMatchObject({
        code: ESQL_ERROR_CODES.ERR_MISSING_ID_FIELD_FROM_RESULT,
      });
    });

    it('succeeds validation when METADATA "_id" field EXISTS', async () => {
      getESQLQueryColumnsMock.mockResolvedValue([{ id: '_id' }, { id: 'column1' }]);

      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test* metadata _id'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toBeUndefined();
    });
  });

  describe('METADATA _id field validation for aggregating queries', () => {
    it('succeeds validation when METADATA operator with "_id" field is missing', () => {
      getESQLQueryColumnsMock.mockResolvedValue([{ id: 'column1' }, { id: 'column2' }]);

      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue(
            'from test* metadata someField | stats c = count(*) by fieldA'
          ),
        } as EsqlQueryValidatorArgs)
      ).resolves.toBeUndefined();
    });
  });

  describe('when getESQLQueryColumns fails', () => {
    it('returns a validation error', () => {
      // suppress the expected error messages
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

const getESQLQueryColumnsMock = getESQLQueryColumns as jest.Mock;

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
