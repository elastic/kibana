/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey } from '../../../../common/runtime_types';
import {
  secondsToCronFormatter,
  arrayToJsonFormatter,
  objectToJsonFormatter,
  stringToJsonFormatter,
} from './formatting_utils';

describe('formatters', () => {
  describe('cronToSecondsNormalizer', () => {
    it('takes a number of seconds and converts it to cron format', () => {
      expect(secondsToCronFormatter({ [ConfigKey.WAIT]: '3' }, ConfigKey.WAIT)).toEqual('3s');
    });
  });

  describe('arrayToJsonFormatter', () => {
    it('takes an array and converts it to json', () => {
      expect(arrayToJsonFormatter({ [ConfigKey.TAGS]: ['tag1', 'tag2'] }, ConfigKey.TAGS)).toEqual(
        '["tag1","tag2"]'
      );
    });

    it('returns null if the array has length of 0', () => {
      expect(arrayToJsonFormatter({ [ConfigKey.TAGS]: [] }, ConfigKey.TAGS)).toEqual(null);
    });
  });

  describe('objectToJsonFormatter', () => {
    it('takes a json object string and returns an object', () => {
      expect(
        objectToJsonFormatter(
          { [ConfigKey.RESPONSE_HEADERS_CHECK]: { key: 'value' } },
          ConfigKey.RESPONSE_HEADERS_CHECK
        )
      ).toEqual('{"key":"value"}');
    });

    it('returns null if the object has no keys', () => {
      expect(objectToJsonFormatter({ [ConfigKey.METADATA]: {} }, ConfigKey.METADATA)).toEqual(null);
    });
  });

  describe('stringToJsonFormatter', () => {
    it('takes a string and returns an json string', () => {
      expect(
        stringToJsonFormatter(
          { [ConfigKey.SOURCE_INLINE]: 'step("test step", () => {})' },
          ConfigKey.SOURCE_INLINE
        )
      ).toEqual('"step(\\"test step\\", () => {})"');
    });

    it('returns null if the string is falsy', () => {
      expect(
        stringToJsonFormatter({ [ConfigKey.SOURCE_INLINE]: '' }, ConfigKey.SOURCE_INLINE)
      ).toEqual(null);
    });
  });
});
