/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPercChange } from './helpers';

describe('getPercChange', () => {
  it('shows positive percent change', () => {
    expect(getPercChange(200, 100)).toEqual('100.0%');
  });
  it('shows negative percent change', () => {
    expect(getPercChange(100, 200)).toEqual('-50.0%');
  });
  it('handles percent change, new number is 0', () => {
    expect(getPercChange(0, 100)).toEqual(null);
  });
  it('handles percent change, compare number is 0', () => {
    expect(getPercChange(100, 0)).toEqual(null);
  });
  it('handles percent change, new number is null', () => {
    expect(getPercChange(null, 100)).toEqual(null);
  });
  it('handles percent change, compare number is null', () => {
    expect(getPercChange(100, null)).toEqual(null);
  });
  it('handles percent change, new number is undefined', () => {
    expect(getPercChange(undefined, 100)).toEqual(null);
  });
  it('handles percent change, compare number is undefined', () => {
    expect(getPercChange(100, undefined)).toEqual(null);
  });
});
