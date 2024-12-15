/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPreferredEsType } from './helpers';

describe('helpers', () => {
  describe('getPreferredEsType', () => {
    it('prefers `keyword` over other types when `esTypes` contains a `keyword` entry', () => {
      const esTypes = ['long', 'keyword'];

      expect(getPreferredEsType(esTypes)).toEqual('keyword');
    });

    it('returns the first entry when esTypes has multiple entries, but no `keyword` entry', () => {
      const esTypes = ['long', 'date'];

      expect(getPreferredEsType(esTypes)).toEqual('long');
    });

    it('returns the first entry when esTypes has only one (non-`keyword`) entry', () => {
      const esTypes = ['date'];

      expect(getPreferredEsType(esTypes)).toEqual('date');
    });

    it('returns `keyword` when esTypes only contains a `keyword` entry', () => {
      const esTypes: string[] = ['keyword'];

      expect(getPreferredEsType(esTypes)).toEqual('keyword');
    });

    it('returns `keyword` when esTypes is empty', () => {
      const esTypes: string[] = [];

      expect(getPreferredEsType(esTypes)).toEqual('keyword');
    });
  });
});
