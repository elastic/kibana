/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveFieldControl } from '.';

describe('resolveFieldControl', () => {
  describe('enum wins over type', () => {
    it('resolves an enum of strings to a select', () => {
      expect(resolveFieldControl({ enum: ['approve', 'dismiss'], type: 'string' })).toBe('select');
    });

    it('resolves an enum of numbers to a select rather than a number field', () => {
      expect(resolveFieldControl({ enum: [1, 2], type: 'number' })).toBe('select');
    });

    it('resolves an enum on a boolean to a select rather than a switch', () => {
      expect(resolveFieldControl({ enum: ['yes', 'no'], type: 'boolean' })).toBe('select');
    });

    // The one exception: an array is multi-select, so its own type wins.
    it('resolves an enum on an array to a combo box', () => {
      expect(
        resolveFieldControl({ enum: ['contain'], items: { enum: ['contain'] }, type: 'array' })
      ).toBe('comboBox');
    });

    it('falls through to the type when the enum is empty', () => {
      expect(resolveFieldControl({ enum: [], type: 'boolean' })).toBe('switch');
    });
  });

  describe('type dispatch', () => {
    it('resolves a boolean to a switch', () => {
      expect(resolveFieldControl({ type: 'boolean' })).toBe('switch');
    });

    it('resolves a number to a number field', () => {
      expect(resolveFieldControl({ type: 'number' })).toBe('fieldNumber');
    });

    it('resolves an array to a combo box', () => {
      expect(resolveFieldControl({ items: { enum: ['contain'] }, type: 'array' })).toBe('comboBox');
    });

    it('resolves a string to a text field', () => {
      expect(resolveFieldControl({ type: 'string' })).toBe('fieldText');
    });
  });
});
