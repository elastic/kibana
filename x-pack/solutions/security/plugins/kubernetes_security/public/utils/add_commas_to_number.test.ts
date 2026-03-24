/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addCommasToNumber } from './add_commas_to_number';

describe('addCommasToNumber(num)', () => {
  it('works for a number without needing a comma', () => {
    expect(addCommasToNumber(123)).toEqual('123');
  });
  it('works for a number that needs a comma', () => {
    expect(addCommasToNumber(1234)).toEqual('1,234');
  });
  it('works for a number that needs multiple commas', () => {
    expect(addCommasToNumber(123456789)).toEqual('123,456,789');
  });
  it('works for negative number', () => {
    expect(addCommasToNumber(-10)).toEqual('-10');
  });
  it('works for negative number with commas', () => {
    expect(addCommasToNumber(-10000)).toEqual('-10,000');
  });
  it('works for NaN', () => {
    expect(addCommasToNumber(NaN)).toEqual('NaN');
  });
  it('works for Infinity', () => {
    expect(addCommasToNumber(Infinity)).toEqual('Infinity');
  });
  it('works for zero', () => {
    expect(addCommasToNumber(0)).toEqual('0');
  });
});
