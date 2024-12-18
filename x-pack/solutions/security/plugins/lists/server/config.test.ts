/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { ConfigSchema, ConfigType } from './config';
import { getConfigMock, getConfigMockDecoded } from './config.mock';

describe('config_schema', () => {
  test('it works with expected basic mock data set and defaults', () => {
    expect(ConfigSchema.validate(getConfigMock())).toEqual(getConfigMockDecoded());
  });

  test('it throws if given an invalid value', () => {
    const mock: Partial<ConfigType> & { madeUpValue: string } = {
      madeUpValue: 'something',
      ...getConfigMock(),
    };
    expect(() => ConfigSchema.validate(mock)).toThrow(
      '[madeUpValue]: definition for this key is missing'
    );
  });

  test('it throws if the "maxImportPayloadBytes" value is 0', () => {
    const mock: ConfigType = {
      ...getConfigMockDecoded(),
      maxImportPayloadBytes: 0,
    };
    expect(() => ConfigSchema.validate(mock)).toThrow(
      '[maxImportPayloadBytes]: Value must be equal to or greater than [1].'
    );
  });

  test('it throws if the "maxImportPayloadBytes" value is less than 0', () => {
    const mock: ConfigType = {
      ...getConfigMockDecoded(),
      maxImportPayloadBytes: -1,
    };
    expect(() => ConfigSchema.validate(mock)).toThrow(
      '[maxImportPayloadBytes]: Value must be equal to or greater than [1].'
    );
  });

  test('it throws if the "importBufferSize" value is 0', () => {
    const mock: ConfigType = {
      ...getConfigMockDecoded(),
      importBufferSize: 0,
    };
    expect(() => ConfigSchema.validate(mock)).toThrow(
      '[importBufferSize]: Value must be equal to or greater than [1].'
    );
  });

  test('it throws if the "importBufferSize" value is less than 0', () => {
    const mock: ConfigType = {
      ...getConfigMockDecoded(),
      importBufferSize: -1,
    };
    expect(() => ConfigSchema.validate(mock)).toThrow(
      '[importBufferSize]: Value must be equal to or greater than [1].'
    );
  });

  test('it throws if the "importTimeout" value is less than 2 minutes', () => {
    const mock: ConfigType = {
      ...getConfigMockDecoded(),
      importTimeout: moment.duration(2, 'minutes').subtract(1, 'second'),
    };
    expect(() => ConfigSchema.validate(mock)).toThrow(
      '[importTimeout]: duration cannot be less than 2 minutes'
    );
  });

  test('it throws if the "importTimeout" value is greater than 1 hour', () => {
    const mock: ConfigType = {
      ...getConfigMockDecoded(),
      importTimeout: moment.duration(1, 'hour').add(1, 'second'),
    };
    expect(() => ConfigSchema.validate(mock)).toThrow(
      '[importTimeout]: duration cannot be greater than 30 minutes'
    );
  });

  test('it throws if the "maxExceptionsImportSize" value is less than 0', () => {
    const mock: ConfigType = {
      ...getConfigMockDecoded(),
      maxExceptionsImportSize: -1,
    };
    expect(() => ConfigSchema.validate(mock)).toThrow(
      '[maxExceptionsImportSize]: Value must be equal to or greater than [1].'
    );
  });
});
