/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey } from '../types';
import { FIELD } from './field_config';

jest.mock('../../../../../utils/kibana_service', () => ({
  kibanaService: { coreStart: { docLinks: { links: {} } } },
}));

describe('FIELD params validation', () => {
  const getValidParams = (): ((value: string) => unknown) => {
    const validate = FIELD()[ConfigKey.PARAMS]?.validation?.({} as never)?.validate;
    if (!validate || typeof validate === 'function' || !validate.validParams) {
      throw new Error('Expected a validParams validator on the params field');
    }
    return (value) => validate.validParams(value, {} as never);
  };
  const validParams = getValidParams();

  it.each(['', '{}', '{"username":"elastic"}'])('accepts empty or object params: %s', (value) => {
    expect(validParams(value)).toBe(true);
  });

  it.each(['[]', '["secret"]'])('reports that params must be a JSON object: %s', (value) => {
    expect(validParams(value)).toBe('Parameters must be a JSON object');
  });

  it('reports malformed JSON as invalid', () => {
    expect(validParams('{invalid')).toBe('Invalid JSON format');
  });
});
