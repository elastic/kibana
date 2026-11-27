/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_ALL_VALUE, ENVIRONMENT_NOT_DEFINED_VALUE } from '@kbn/apm-types';
import { esqlEnvironmentCondition } from './esql_values';

const FIELDS = ['service.environment', 'resource.attributes.deployment.environment.name'];

describe('esqlEnvironmentCondition', () => {
  it('has no condition for all environments', () => {
    expect(esqlEnvironmentCondition(undefined, FIELDS)).toBeUndefined();
    expect(esqlEnvironmentCondition('', FIELDS)).toBeUndefined();
    expect(esqlEnvironmentCondition(ENVIRONMENT_ALL_VALUE, FIELDS)).toBeUndefined();
  });

  it('keeps an environment in any of the fields', () => {
    expect(esqlEnvironmentCondition('production', FIELDS)).toBe(
      '(service.environment == "production" OR resource.attributes.deployment.environment.name == "production")'
    );
  });

  it('reads "Not defined" as APM\'s sentinel or none of the fields set', () => {
    expect(esqlEnvironmentCondition(ENVIRONMENT_NOT_DEFINED_VALUE, FIELDS)).toBe(
      '(service.environment == "ENVIRONMENT_NOT_DEFINED" OR (service.environment IS NULL AND resource.attributes.deployment.environment.name IS NULL))'
    );
  });

  it('checks the sentinel in the field it is given', () => {
    expect(
      esqlEnvironmentCondition(ENVIRONMENT_NOT_DEFINED_VALUE, ['environment'], 'environment')
    ).toBe('(environment == "ENVIRONMENT_NOT_DEFINED" OR (environment IS NULL))');
  });

  it('escapes the environment', () => {
    expect(esqlEnvironmentCondition('a"b', ['service.environment'])).toBe(
      '(service.environment == "a\\"b")'
    );
  });
});
