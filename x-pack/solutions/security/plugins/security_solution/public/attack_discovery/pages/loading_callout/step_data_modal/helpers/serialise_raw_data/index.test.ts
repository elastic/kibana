/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serialiseRawData } from '.';

describe('serialiseRawData', () => {
  describe('when dataType is "alerts"', () => {
    it('joins alert strings with blank lines', () => {
      const items = ['alert1', 'alert2', 'alert3'];

      const result = serialiseRawData(items, 'alerts');

      expect(result).toBe('alert1\n\nalert2\n\nalert3');
    });

    it('converts non-string items to strings', () => {
      const items = [123, null, undefined];

      const result = serialiseRawData(items, 'alerts');

      expect(result).toBe('123\n\nnull\n\nundefined');
    });

    it('returns an empty string for an empty array', () => {
      const result = serialiseRawData([], 'alerts');

      expect(result).toBe('');
    });
  });

  describe('when dataType is "discoveries"', () => {
    it('pretty-prints items as JSON', () => {
      const items = [{ title: 'Discovery 1' }, { title: 'Discovery 2' }];

      const result = serialiseRawData(items, 'discoveries');

      expect(result).toBe(JSON.stringify(items, null, 2));
    });

    it('returns "[]" for an empty array', () => {
      const result = serialiseRawData([], 'discoveries');

      expect(result).toBe('[]');
    });
  });

  describe('when dataType is "validated_discoveries"', () => {
    it('pretty-prints items as JSON', () => {
      const items = [{ title: 'Validated' }];

      const result = serialiseRawData(items, 'validated_discoveries');

      expect(result).toBe(JSON.stringify(items, null, 2));
    });
  });
});
