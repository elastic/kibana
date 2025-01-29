/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConditionalPath } from './path_utils';

describe('painless path utils', () => {
  describe('getConditionalPath', () => {
    it('should do nothing with single value', () => {
      const path = 'a';
      const result = getConditionalPath(path);
      expect(result).toEqual('a');
    });
    it('should conditionalise path length 2', () => {
      const path = 'a.b';
      const result = getConditionalPath(path);
      expect(result).toEqual('a?.b');
    });
    it('should conditionalise longer path', () => {
      const path = 'a.b.c.d.e.f.g';
      const result = getConditionalPath(path);
      expect(result).toEqual('a?.b?.c?.d?.e?.f?.g');
    });
  });
});
