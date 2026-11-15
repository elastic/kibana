/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient } from '@kbn/react-query';
import type { FieldHook, FormData, ValidationFuncArg } from '../../../shared_imports';
import type { FieldValueQueryBar } from '../../rule_creation_ui/components/query_bar_field';
import { extractValidationResults } from '../../../common/hooks/use_form_with_warnings/extract_validation_results';
import { esqlQueryValidatorFactory } from '../components/esql_query_edit/validators/esql_query_validator_factory';
import { ESQL_MISSING_ID_FIELD_WARNING } from '../components/esql_query_edit/validators/translations';
import { fetchEsqlQueryColumns } from '../logic/esql_query_columns';
import { extractValidationMessages } from '../logic/extract_validation_messages';
import {
  VALIDATION_WARNING_CODES,
  VALIDATION_WARNING_CODE_FIELD_NAME_MAP,
} from './validation_warning_codes';

jest.mock('../logic/esql_query_columns', () => ({
  fetchEsqlQueryColumns: jest.fn(),
}));

const fetchEsqlQueryColumnsMock = fetchEsqlQueryColumns as jest.Mock;

describe('ES|QL validation results on rule submit', () => {
  beforeEach(() => {
    fetchEsqlQueryColumnsMock.mockReset();
  });

  it('treats a query that drops _id as a non-blocking warning shown in the confirmation modal', async () => {
    fetchEsqlQueryColumnsMock.mockResolvedValue([{ id: 'agent.name' }]);

    const { errors, warnings } = await validateEsqlQueryField('from test* metadata _id | drop _id');

    expect(errors).toEqual([]);
    expect(extractValidationMessages(warnings, VALIDATION_WARNING_CODE_FIELD_NAME_MAP)).toEqual([
      `ES|QL Query: ${ESQL_MISSING_ID_FIELD_WARNING}`,
    ]);
  });

  it('keeps a syntax error blocking', async () => {
    const { errors, warnings } = await validateEsqlQueryField('from test* | where true test');

    expect(warnings).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(fetchEsqlQueryColumnsMock).not.toHaveBeenCalled();
  });
});

async function validateEsqlQueryField(esqlQuery: string) {
  const validator = esqlQueryValidatorFactory({ queryClient: new QueryClient() });
  const value: FieldValueQueryBar = {
    query: { query: esqlQuery, language: 'esql' },
    filters: [],
    saved_id: null,
  };
  const error = await validator({ value } as ValidationFuncArg<FormData, FieldValueQueryBar>);
  const field = { path: 'queryBar', errors: error ? [error] : [] } as unknown as FieldHook;

  return extractValidationResults([field], VALIDATION_WARNING_CODES);
}
