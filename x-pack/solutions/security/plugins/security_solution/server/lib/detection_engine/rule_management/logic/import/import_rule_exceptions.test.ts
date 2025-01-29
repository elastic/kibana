/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getImportExceptionsListSchemaMock } from '@kbn/lists-plugin/common/schemas/request/import_exceptions_schema.mock';

import { importRuleExceptions } from './import_rule_exceptions';

// Other than the tested logic below, this method just returns the result of
// calling into exceptionsClient.importExceptionListAndItemsAsArray. Figure it's
// more important to test that out well than mock out the results and check it
// returns that mock
describe('importRuleExceptions', () => {
  it('reports success and success count 0 if no exception list client passed down', async () => {
    const result = await importRuleExceptions({
      exceptions: [getImportExceptionsListSchemaMock()],
      exceptionsClient: undefined,
      overwrite: true,
      maxExceptionsImportSize: 10000,
    });

    expect(result).toEqual({
      success: true,
      errors: [],
      successCount: 0,
    });
  });
});
