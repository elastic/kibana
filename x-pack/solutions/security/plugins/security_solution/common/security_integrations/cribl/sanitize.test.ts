/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATA_ID_MAX_LENGTH, isValidDataId } from './sanitize';

describe('cribl dataId validate', () => {
  describe('isValidDataId', () => {
    it('accepts allowlisted ids', () => {
      expect(isValidDataId('criblSource1')).toBe(true);
      expect(isValidDataId('source.with.dots')).toBe(true);
      expect(isValidDataId('a')).toBe(true);
    });

    it('rejects empty, injection, spaces, overlong, and control chars', () => {
      expect(isValidDataId('')).toBe(false);
      expect(isValidDataId(`x' || true || 'y`)).toBe(false);
      expect(isValidDataId('has spaces')).toBe(false);
      expect(isValidDataId('a'.repeat(DATA_ID_MAX_LENGTH + 1))).toBe(false);
      expect(isValidDataId('ctrl\x00char')).toBe(false);
    });
  });
});
