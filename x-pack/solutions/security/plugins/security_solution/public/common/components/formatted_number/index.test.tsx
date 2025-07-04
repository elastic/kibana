/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compactNotationParts } from '.';

describe('compactNotationParts', () => {
  describe('When given a small number under 1000', () => {
    it('does not change the presentation of small numbers', () => {
      expect(compactNotationParts(1)).toEqual([1, '', '']);
      expect(compactNotationParts(100)).toEqual([100, '', '']);
      expect(compactNotationParts(999)).toEqual([999, '', '']);
    });
  });
  describe('When given a number greater or equal to 1000 but less than 1000000', () => {
    it('presents the number as untis of k', () => {
      expect(compactNotationParts(1000)).toEqual([1, 'k', '']);
      expect(compactNotationParts(1001)).toEqual([1, 'k', '+']);
      expect(compactNotationParts(10000)).toEqual([10, 'k', '']);
      expect(compactNotationParts(10001)).toEqual([10, 'k', '+']);
      expect(compactNotationParts(999999)).toEqual([999, 'k', '+']);
    });
  });
  describe('When given a number greater or equal to 1000000 but less than 1000000000', () => {
    it('presents the number as untis of M', () => {
      expect(compactNotationParts(1000000)).toEqual([1, 'M', '']);
      expect(compactNotationParts(1000001)).toEqual([1, 'M', '+']);
      expect(compactNotationParts(10000000)).toEqual([10, 'M', '']);
      expect(compactNotationParts(10000001)).toEqual([10, 'M', '+']);
      expect(compactNotationParts(999999999)).toEqual([999, 'M', '+']);
    });
  });
  describe('When given a number greater or equal to 1000000000 but less than 1000000000000', () => {
    it('presents the number as untis of B', () => {
      expect(compactNotationParts(1000000000)).toEqual([1, 'B', '']);
      expect(compactNotationParts(1000000001)).toEqual([1, 'B', '+']);
      expect(compactNotationParts(10000000000)).toEqual([10, 'B', '']);
      expect(compactNotationParts(10000000001)).toEqual([10, 'B', '+']);
      expect(compactNotationParts(999999999999)).toEqual([999, 'B', '+']);
    });
  });
  describe('When given a number greater or equal to 1000000000000', () => {
    it('presents the number as untis of T', () => {
      expect(compactNotationParts(1000000000000)).toEqual([1, 'T', '']);
      expect(compactNotationParts(1000000000001)).toEqual([1, 'T', '+']);
      expect(compactNotationParts(10000000000000)).toEqual([10, 'T', '']);
      expect(compactNotationParts(10000000000001)).toEqual([10, 'T', '+']);
      expect(compactNotationParts(999999999999999)).toEqual([999, 'T', '+']);
      expect(compactNotationParts(9999999999999990)).toEqual([9999, 'T', '+']);
    });
  });
});
