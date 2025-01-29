/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertCloseTo } from './assert_close_to';

describe('assertCloseTo', () => {
  it('does not throw an error when expected value is correct', () => {
    assertCloseTo(10000, 10001, 100);
  });

  it('does not throw an error when expected value is under actual, but within precision threshold', () => {
    assertCloseTo(10000, 9875, 300);
  });

  it('throws an error when expected value is outside of precision range', () => {
    expect(() => assertCloseTo(10000, 12500, 100)).toThrowErrorMatchingSnapshot();
  });
});
