/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockBrowserFields, mockIndexFields, mockIndexFieldsByName } from './mock';
import * as indexUtils from '.';

describe('source/index.tsx', () => {
  describe('getAllBrowserFields', () => {
    it('should return the expected browser fields list', () => {
      expect(indexUtils.getAllBrowserFields(mockBrowserFields)).toEqual(mockIndexFields);
    });
  });

  describe('getAllFieldsByName', () => {
    it('should return the expected browser fields list', () => {
      expect(indexUtils.getAllFieldsByName(mockBrowserFields)).toEqual(mockIndexFieldsByName);
    });
  });
});
