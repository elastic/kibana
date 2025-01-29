/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHitsMetadata } from '@elastic/elasticsearch/lib/api/types';
import { getHitsTotal } from './get_hits_total';

describe('getHitsTotal', () => {
  describe('when hits.total is number', () => {
    it('should return it', () => {
      const hits = { total: 5 } as SearchHitsMetadata;
      expect(getHitsTotal(hits)).toBe(5);
    });
  });

  describe('when hits.total is object', () => {
    it('should return hits.total.value', () => {
      const hits = { total: { value: 10 } } as SearchHitsMetadata;
      expect(getHitsTotal(hits)).toBe(10);
    });
  });

  describe('when hits.total is 0', () => {
    it('should return it', () => {
      const hits = { total: 0 } as SearchHitsMetadata;
      expect(getHitsTotal(hits)).toBe(0);
    });
  });
});
