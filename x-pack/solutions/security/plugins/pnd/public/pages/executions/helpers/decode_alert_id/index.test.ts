/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeAlertId } from '.';

describe('decodeAlertId', () => {
  it('returns undefined when the route carries no id', () => {
    expect(decodeAlertId(undefined)).toBeUndefined();
  });

  it('returns undefined for an empty id', () => {
    expect(decodeAlertId('')).toBeUndefined();
  });

  it('passes an ordinary id through', () => {
    expect(decodeAlertId('ad-1')).toBe('ad-1');
  });

  it('decodes an id the router did not decode', () => {
    expect(decodeAlertId('ad%201%2F2')).toBe('ad 1/2');
  });

  it('keeps a stray percent sign rather than throwing on it', () => {
    expect(decodeAlertId('100%')).toBe('100%');
  });
});
