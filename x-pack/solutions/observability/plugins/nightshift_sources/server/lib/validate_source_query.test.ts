/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { validateSourceQuery } from './validate_source_query';

describe('validateSourceQuery', () => {
  it('throws a 400 Boom with the shared validator message', () => {
    try {
      validateSourceQuery({ esql: 'ROW a = 1' });
    } catch (error) {
      expect(isBoom(error)).toBe(true);
      expect(error.output.statusCode).toBe(400);
      expect(error.message).toBe('A source query must start with FROM or TS');
      return;
    }
    throw new Error('expected "ROW a = 1" to be rejected');
  });

  it('returns the type of a query that targets one kind of data', () => {
    expect(validateSourceQuery({ esql: 'FROM logs-*' })).toBe('logs');
  });

  it('throws a 400 Boom when the query mixes types', () => {
    expect(() => validateSourceQuery({ esql: 'FROM logs-*, traces-*' })).toThrow(
      expect.objectContaining({ message: expect.stringContaining('mixes') })
    );
  });

  it('throws a 400 Boom when one index matches more than one type', () => {
    expect(() => validateSourceQuery({ esql: 'FROM logs-traces-*' })).toThrow(
      expect.objectContaining({ message: expect.stringContaining('more than one kind') })
    );
  });
});
