/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseFieldToken } from './helpers';

describe('helpers', () => {
  describe('parseFieldToken', () => {
    it('returns a parsed field from the token values', () => {
      expect(parseFieldToken('host.name', 'my-host')).toEqual({
        name: 'host.name',
        operator: ':',
        value: 'my-host',
      });
    });
  });
});
