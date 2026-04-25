/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRowRendererClassName } from './helpers';

describe('helpers', () => {
  describe('getRowRendererClassName', () => {
    test('it returns the expected class name', () => {
      expect(getRowRendererClassName(2)).toBe('row-renderer-2');
    });
  });
});
