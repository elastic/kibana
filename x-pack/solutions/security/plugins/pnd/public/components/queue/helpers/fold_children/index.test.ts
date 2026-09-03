/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { THREAD_GROUP_FOLD_AFTER } from '../../types';
import { foldChildren } from '.';

const children = ['a', 'b', 'c', 'd', 'e'] as const;

describe('foldChildren', () => {
  it('folds after three by default, which is the thread-mode rule', () => {
    expect(THREAD_GROUP_FOLD_AFTER).toEqual(3);
  });

  it('keeps the first three children when the fold is closed', () => {
    expect(foldChildren({ children, expanded: false }).visible).toEqual(['a', 'b', 'c']);
  });

  it('reports how many children sit behind the fold', () => {
    expect(foldChildren({ children, expanded: false }).hiddenCount).toEqual(2);
  });

  it('reveals every child once the fold is expanded', () => {
    expect(foldChildren({ children, expanded: true }).visible).toEqual([...children]);
  });

  it('still reports the hidden count after expand, so the control can hide itself', () => {
    expect(foldChildren({ children, expanded: true }).hiddenCount).toEqual(2);
  });

  it('shows every child when there is nothing to fold', () => {
    expect(foldChildren({ children: ['a', 'b'], expanded: false }).visible).toEqual(['a', 'b']);
  });

  it('reports no hidden children when the list fits in the fold', () => {
    expect(foldChildren({ children: ['a', 'b', 'c'], expanded: false }).hiddenCount).toEqual(0);
  });
});
