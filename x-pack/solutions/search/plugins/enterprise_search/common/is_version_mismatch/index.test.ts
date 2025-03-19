/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isVersionMismatch } from '.';

describe('isVersionMismatch', () => {
  it('no mismatch if major and minor are the same', () => {
    expect(isVersionMismatch('8.0.0', '8.0.1')).toBe(false);
  });

  it('mismatch if kibana minor is different than enterprise search minor', () => {
    expect(isVersionMismatch('8.0.0', '8.1.0')).toBe(true);
  });

  it('mismatch if major is different', () => {
    expect(isVersionMismatch('7.0.0', '8.0.0')).toBe(true);
  });

  it('no mismatch if versions are not available to analyze', () => {
    expect(isVersionMismatch()).toBe(false);
  });
});
