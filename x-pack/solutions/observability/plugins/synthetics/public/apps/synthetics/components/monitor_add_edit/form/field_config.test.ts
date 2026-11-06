/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey, HttpAuthMethod, MonitorTypeEnum } from '../types';
import { FIELD, KERBEROS_NTLM_PRIVATE_LOCATIONS_ONLY } from './field_config';

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

describe('FIELD locations validation for Kerberos and NTLM', () => {
  const managedLocation = { id: 'eu-west-1', label: 'EU West', isServiceManaged: true };
  const privateLocation = { id: 'private-1', label: 'Private', isServiceManaged: false };

  const validate = (authType: HttpAuthMethod, locations: unknown[]) => {
    const rules = FIELD()[ConfigKey.LOCATIONS]?.validation?.([
      MonitorTypeEnum.HTTP,
      authType,
    ])?.validate;
    if (!rules || typeof rules === 'function' || !rules.privateLocationsForHttpAuth) {
      throw new Error('Expected a privateLocationsForHttpAuth validator on the locations field');
    }
    return rules.privateLocationsForHttpAuth(locations, {} as never);
  };

  it.each([HttpAuthMethod.KERBEROS, HttpAuthMethod.NTLM])(
    'rejects an Elastic managed location with %s auth',
    (authType) => {
      expect(validate(authType, [privateLocation, managedLocation])).toBe(
        KERBEROS_NTLM_PRIVATE_LOCATIONS_ONLY
      );
    }
  );

  it.each([HttpAuthMethod.KERBEROS, HttpAuthMethod.NTLM])(
    'accepts private locations with %s auth',
    (authType) => {
      expect(validate(authType, [privateLocation])).toBe(true);
    }
  );

  it.each([HttpAuthMethod.NONE, HttpAuthMethod.BASIC])(
    'accepts Elastic managed locations with %s auth',
    (authType) => {
      expect(validate(authType, [managedLocation])).toBe(true);
    }
  );
});

describe('FIELD Kerberos realm', () => {
  // Uncontrolled fields only show their error text through `errors[fieldKey]`, which does not
  // resolve a nested key such as `kerberos.realm`, so the field must be controlled.
  it('is required and controlled so its error message renders', () => {
    expect(FIELD()['kerberos.realm']).toMatchObject({ required: true, controlled: true });
  });
});
