/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValue } from './first_value';

describe('firstValue', () => {
  it('returns the first value when it is present', () => {
    expect(firstValue('host.os.version', 'os.version')).toBe('host.os.version');
  });

  it('skips undefined values', () => {
    expect(firstValue(undefined, 'aws')).toBe('aws');
  });

  it('skips null values', () => {
    expect(firstValue(null, 'aws')).toBe('aws');
  });

  it('skips empty strings', () => {
    expect(firstValue('', 'aws')).toBe('aws');
  });

  it('skips empty arrays', () => {
    expect(firstValue([], ['10.0.0.1'])).toEqual(['10.0.0.1']);
  });

  it('returns a non-empty array as-is', () => {
    const ips = ['10.0.0.1', '10.0.0.2'];

    expect(firstValue(undefined, ips)).toBe(ips);
  });

  it('returns undefined when every candidate is empty', () => {
    expect(firstValue(undefined, null, '', [])).toBeUndefined();
  });

  it('returns undefined when called without candidates', () => {
    expect(firstValue()).toBeUndefined();
  });

  it('does not skip values that are falsy but meaningful', () => {
    expect(firstValue('0', 'fallback')).toBe('0');
  });
});
