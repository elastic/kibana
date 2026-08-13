/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATA_ID_MAX_LENGTH, isValidDataId, sanitizeDataIdInput } from './sanitize';

describe('cribl dataId sanitize', () => {
  describe('sanitizeDataIdInput', () => {
    it('keeps allowlisted characters', () => {
      expect(sanitizeDataIdInput('criblSource1')).toBe('criblSource1');
      expect(sanitizeDataIdInput('source.with.dots')).toBe('source.with.dots');
      expect(sanitizeDataIdInput('source_with-dashes')).toBe('source_with-dashes');
    });

    it('strips disallowed characters without inventing content', () => {
      expect(sanitizeDataIdInput(`evil' || true || '`)).toBe('eviltrue');
      expect(sanitizeDataIdInput('a\\b')).toBe('ab');
      expect(sanitizeDataIdInput('has spaces')).toBe('hasspaces');
      expect(sanitizeDataIdInput('line\nbreak')).toBe('linebreak');
      expect(sanitizeDataIdInput('quote\u2019id')).toBe('quoteid');
    });

    it('truncates to DATA_ID_MAX_LENGTH', () => {
      const long = `${'a'.repeat(DATA_ID_MAX_LENGTH)}extra`;
      expect(sanitizeDataIdInput(long)).toBe('a'.repeat(DATA_ID_MAX_LENGTH));
    });

    it('returns empty string when nothing remains', () => {
      expect(sanitizeDataIdInput(`' ||  || '`)).toBe('');
      expect(sanitizeDataIdInput('')).toBe('');
    });
  });

  describe('isValidDataId', () => {
    it('accepts allowlisted ids', () => {
      expect(isValidDataId('criblSource1')).toBe(true);
      expect(isValidDataId('source.with.dots')).toBe(true);
      expect(isValidDataId('a')).toBe(true);
    });

    it('rejects empty, overlong, and injection strings', () => {
      expect(isValidDataId('')).toBe(false);
      expect(isValidDataId(`x' || true || 'y`)).toBe(false);
      expect(isValidDataId('has spaces')).toBe(false);
      expect(isValidDataId('a'.repeat(DATA_ID_MAX_LENGTH + 1))).toBe(false);
      expect(isValidDataId('ctrl\x00char')).toBe(false);
    });
  });
});
