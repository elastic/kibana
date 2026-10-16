/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { combineWhere, IS_NOT_DELETED, IS_NOT_EXCLUDED, IS_NOT_EXPIRED } from './esql_helpers';

describe('combineWhere', () => {
  it('returns undefined when all conditions are undefined', () => {
    expect(combineWhere(undefined, undefined)).toBeUndefined();
  });

  it('returns the single condition unwrapped', () => {
    const cond = esql.exp`foo == true`;
    expect(combineWhere(cond)).toBe(cond);
  });

  it('skips undefined conditions', () => {
    const cond = esql.exp`foo == true`;
    expect(combineWhere(undefined, cond, undefined)).toBe(cond);
  });

  it('wraps OR sub-expressions in parentheses so AND binds correctly', () => {
    // Without parentheses `(A OR B) AND (C OR D)` would serialise as
    // `A OR B AND C OR D`, which ES|QL re-parses as `A OR (B AND C) OR D`.
    const combined = combineWhere(IS_NOT_DELETED, IS_NOT_EXCLUDED, IS_NOT_EXPIRED)!;
    const query = esql.from(['.idx']).where`${combined}`.keep('_source');
    const printed = query.print('basic');

    expect(printed).toContain('(deleted IS NULL OR deleted == FALSE)');
    expect(printed).toContain('(excluded IS NULL OR excluded == FALSE)');
    expect(printed).toContain('(expires_at IS NULL OR expires_at >= NOW())');
  });

  it('correctly combines two OR conditions with AND', () => {
    const combined = combineWhere(IS_NOT_DELETED, IS_NOT_EXPIRED)!;
    const query = esql.from(['.idx']).where`${combined}`.keep('_source');
    const printed = query.print('basic');

    expect(printed).toContain(
      '(deleted IS NULL OR deleted == FALSE) AND (expires_at IS NULL OR expires_at >= NOW())'
    );
  });
});
