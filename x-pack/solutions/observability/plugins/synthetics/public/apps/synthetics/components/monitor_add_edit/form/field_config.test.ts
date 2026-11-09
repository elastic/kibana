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
  const getValidator = (name: string): ((value: string) => unknown) => {
    const validate = FIELD()[ConfigKey.PARAMS]?.validation?.({} as never)?.validate;
    if (!validate || typeof validate === 'function' || !validate[name]) {
      throw new Error(`Expected a ${name} validator on the params field`);
    }
    return (value) => validate[name](value, {} as never);
  };
  const validParams = getValidator('validParams');
  const validParamNames = getValidator('validParamNames');

  it.each(['', '{}', '{"username":"elastic"}'])('accepts empty or object params: %s', (value) => {
    expect(validParams(value)).toBe(true);
    expect(validParamNames(value)).toBe(true);
  });

  it.each(['[]', '["secret"]'])('reports that params must be a JSON object: %s', (value) => {
    expect(validParams(value)).toBe('Parameters must be a JSON object');
  });

  it('reports malformed JSON as invalid', () => {
    expect(validParams('{invalid')).toBe('Invalid JSON format');
  });

  it.each(['{"":"orphan"}', '{"token":"a","token":"b"}'])(
    'reports missing or duplicate parameter names: %s',
    (value) => {
      expect(validParamNames(value)).toBe('Parameter names must be unique and cannot be empty');
    }
  );
});
