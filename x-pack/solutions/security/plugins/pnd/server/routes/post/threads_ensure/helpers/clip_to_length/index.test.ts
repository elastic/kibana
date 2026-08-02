/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clipToLength } from '.';

describe('clipToLength', () => {
  it('returns a short value unchanged', () => {
    expect(clipToLength('hello', 10)).toEqual('hello');
  });

  it('returns a value of exactly the maximum length unchanged', () => {
    expect(clipToLength('hello', 5)).toEqual('hello');
  });

  it('clips an over-long value to the maximum length, ellipsis included', () => {
    expect(clipToLength('abcdefghij', 5)).toHaveLength(5);
  });

  it('marks a clipped value so it never reads as the whole one', () => {
    expect(clipToLength('abcdefghij', 5)).toEqual('abcd…');
  });

  it('does not leave a dangling space before the ellipsis', () => {
    expect(clipToLength('abcd efghij', 6)).toEqual('abcd…');
  });

  it('returns an empty string for an empty value', () => {
    expect(clipToLength('', 10)).toEqual('');
  });
});
