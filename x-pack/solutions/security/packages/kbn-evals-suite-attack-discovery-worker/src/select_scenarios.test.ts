/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectScenarios } from './select_scenarios';

const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const select = (only: string | undefined) => selectScenarios({ rows, only, envName: 'ENV' });

describe('selectScenarios', () => {
  it('selects every row when nothing is asked for', () => {
    expect(select(undefined)).toEqual(rows);
    expect(select('')).toEqual(rows);
    expect(select(' , ')).toEqual(rows);
  });

  it("selects the named rows in the rows' order, ignoring whitespace", () => {
    expect(select('c, a')).toEqual([{ id: 'a' }, { id: 'c' }]);
  });

  it('throws on a single unknown id, naming it and the valid ids', () => {
    expect(() => select('nope')).toThrow(
      /ENV=nope names unknown scenario "nope"; valid ids: a, b, c/
    );
  });

  it('throws when only one of several ids is unknown, rather than dropping it', () => {
    expect(() => select('a,typo')).toThrow(/unknown scenario "typo"/);
    expect(() => select('a,x,y')).toThrow(/unknown scenarios "x", "y"/);
  });
});
