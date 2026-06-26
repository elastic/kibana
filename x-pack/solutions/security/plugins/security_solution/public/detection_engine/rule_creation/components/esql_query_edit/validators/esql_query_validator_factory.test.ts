/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryClient, CancelledError } from '@kbn/react-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { fetchEsqlQueryColumns } from '../../../logic/esql_query_columns';
import type { FormData, ValidationFunc, ValidationFuncArg } from '../../../../../shared_imports';
import type { FieldValueQueryBar } from '../../../../rule_creation_ui/components/query_bar_field';
import { esqlQueryValidatorFactory } from './esql_query_validator_factory';
import { ESQL_ERROR_CODES } from './error_codes';

jest.mock('../../../logic/esql_query_columns', () => ({
  fetchEsqlQueryColumns: jest.fn(),
}));

const fetchEsqlQueryColumnsMock = fetchEsqlQueryColumns as jest.Mock;

describe('esqlQueryValidator', () => {
  beforeEach(() => {
    fetchEsqlQueryColumnsMock.mockClear();
    fetchEsqlQueryColumnsMock.mockResolvedValue([{ id: '_id' }] as DatatableColumn[]);
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
      fetchEsqlQueryColumnsMock.mockResolvedValue([{ id: '_id' }, { id: 'agent.name' }]);

      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test* metadata _id'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toBeUndefined();
    });

    it('returns MISSING_ID_FIELD warning when _id column is absent', () => {
      fetchEsqlQueryColumnsMock.mockResolvedValue([{ id: 'agent.name' }]);

      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test* metadata _id | drop _id'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toMatchObject({
        code: ESQL_ERROR_CODES.MISSING_ID_FIELD,
      });
    });

    it('returns MISSING_ID_FIELD warning when columns are empty', () => {
      fetchEsqlQueryColumnsMock.mockResolvedValue([]);

      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test*'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toMatchObject({
        code: ESQL_ERROR_CODES.MISSING_ID_FIELD,
      });
    });

    it('succeeds for non-aggregating query without explicit metadata when injection adds _id', () => {
      fetchEsqlQueryColumnsMock.mockResolvedValue([{ id: '_id' }, { id: 'agent.name' }]);

      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test*'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toBeUndefined();
    });
  });

  describe('_id column validation for aggregating queries', () => {
    it('succeeds when _id is absent for aggregating query', () => {
      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test* | stats count() by agent.name'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toBeUndefined();
    });
  });

  describe('when fetchEsqlQueryColumns fails', () => {
    it('returns a validation error for unexpected errors', () => {
      fetchEsqlQueryColumnsMock.mockRejectedValue(new Error('some error'));

      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test* metadata _id'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toMatchObject({
        code: ESQL_ERROR_CODES.INVALID_ESQL,
        message: 'Error validating ES|QL: "some error"',
      });
    });

    it('returns undefined when the request is cancelled (CancelledError)', () => {
      fetchEsqlQueryColumnsMock.mockRejectedValue(new CancelledError());

      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test* metadata _id'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toBeUndefined();
    });

    it('returns undefined when the request is aborted (AbortError)', () => {
      const abortError = new DOMException('The operation was aborted.', 'AbortError');
      fetchEsqlQueryColumnsMock.mockRejectedValue(abortError);

      return expect(
        createValidator()({
          value: createEsqlQueryFieldValue('from test* metadata _id'),
        } as EsqlQueryValidatorArgs)
      ).resolves.toBeUndefined();
    });
  });

  describe('cancellation and unmount behavior', () => {
    it('returns undefined without fetching columns when the component is already unmounted', async () => {
      const isUnmountedRef = { current: true };
      const validator = createValidator({ isUnmountedRef });

      const result = await validator({
        value: createEsqlQueryFieldValue('from test*'),
      } as EsqlQueryValidatorArgs);

      expect(result).toBeUndefined();
      expect(fetchEsqlQueryColumnsMock).not.toHaveBeenCalled();
    });

    it('aborts the previous in-flight request when a new validation starts', async () => {
      const previousController = new AbortController();
      const abortSpy = jest.spyOn(previousController, 'abort');
      const abortControllerRef = { current: previousController };
      const validator = createValidator({ abortControllerRef });

      await validator({
        value: createEsqlQueryFieldValue('from test*'),
      } as EsqlQueryValidatorArgs);

      expect(abortSpy).toHaveBeenCalled();
    });

    it('sets abortControllerRef.current to a new AbortController after each validation', async () => {
      const abortControllerRef = { current: null as AbortController | null };
      const validator = createValidator({ abortControllerRef });

      await validator({
        value: createEsqlQueryFieldValue('from test*'),
      } as EsqlQueryValidatorArgs);

      expect(abortControllerRef.current).toBeInstanceOf(AbortController);
    });
  });
});

type EsqlQueryValidatorArgs = ValidationFuncArg<FormData, FieldValueQueryBar>;

interface CreateValidatorOptions {
  abortControllerRef?: { current: AbortController | null };
  isUnmountedRef?: { current: boolean };
}

function createValidator(
  options: CreateValidatorOptions = {}
): ValidationFunc<FormData, string, FieldValueQueryBar> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });

  return esqlQueryValidatorFactory({ queryClient, ...options });
}

function createEsqlQueryFieldValue(esqlQuery: string): Readonly<FieldValueQueryBar> {
  return { query: { query: esqlQuery, language: 'esql' }, filters: [], saved_id: null };
}
