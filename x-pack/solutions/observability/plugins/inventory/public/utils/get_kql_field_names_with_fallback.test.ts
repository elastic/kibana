/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKqlFieldsWithFallback } from './get_kql_field_names_with_fallback';
import { getKqlFieldNamesFromExpression } from '@kbn/es-query';

jest.mock('@kbn/es-query', () => ({
  getKqlFieldNamesFromExpression: jest.fn(),
}));

describe('getKqlFieldsWithFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return field names when getKqlFieldNamesFromExpression succeeds', () => {
    const mockFieldNames = ['field1', 'field2'];
    (getKqlFieldNamesFromExpression as jest.Mock).mockReturnValue(mockFieldNames);
    const expectedArg = 'testKuery';

    const result = getKqlFieldsWithFallback(expectedArg);
    expect(result).toEqual(mockFieldNames);
    expect(getKqlFieldNamesFromExpression).toHaveBeenCalledWith(expectedArg);
  });

  it('should return an empty array when getKqlFieldNamesFromExpression throws an error', () => {
    (getKqlFieldNamesFromExpression as jest.Mock).mockImplementation(() => {
      throw new Error('Test error');
    });
    const expectedArg = 'testKuery';

    const result = getKqlFieldsWithFallback(expectedArg);
    expect(result).toEqual([]);
    expect(getKqlFieldNamesFromExpression).toHaveBeenCalledWith(expectedArg);
  });
});
