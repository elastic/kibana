/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ingestKeysToJSON, ingestKeysToPHP, ingestKeysToRuby } from './helpers';

describe('getting started language helpers', () => {
  describe('ingestKeysToJSON', () => {
    it('return empty string when given undefined', () => {
      expect(ingestKeysToJSON(undefined)).toEqual('');
    });
    it('return json keys with quotes when given expected data', () => {
      expect(ingestKeysToJSON({ _foo: true, _bar: false })).toEqual(
        ', "_foo": true, "_bar": false'
      );
    });
  });
  describe('ingestKeysToPHP', () => {
    it('return empty string when given undefined', () => {
      expect(ingestKeysToPHP(undefined)).toEqual('');
    });
    it('return json keys with quotes when given expected data', () => {
      expect(ingestKeysToPHP({ _foo: true, _bar: false })).toEqual(
        `\n    '_foo' => true,\n    '_bar' => false,`
      );
    });
  });
  describe('ingestKeysToRuby', () => {
    it('return empty string when given undefined', () => {
      expect(ingestKeysToRuby(undefined)).toEqual('');
    });
    it('return json keys with quotes when given expected data', () => {
      expect(ingestKeysToRuby({ _foo: true, _bar: false })).toEqual(', _foo: true, _bar: false');
    });
  });
});
