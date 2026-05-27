/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSecurityAlertType } from '.';
import { SECURITY_ALERT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

describe('getSecurityAlertType', () => {
  const registration = getSecurityAlertType();

  it('registers with the correct id', () => {
    expect(registration.id).toBe(SECURITY_ALERT_ATTACHMENT_TYPE);
  });

  it('exposes a schemaValidator that accepts valid metadata', () => {
    expect(() =>
      registration.schemaValidator?.({
        index: '.alerts-security',
        rule: { id: 'rule-1', name: 'Rule 1' },
      })
    ).not.toThrow();
  });

  it('accepts undefined metadata', () => {
    expect(() => registration.schemaValidator?.(undefined)).not.toThrow();
  });

  it('accepts null rule', () => {
    expect(() => registration.schemaValidator?.({ rule: null })).not.toThrow();
  });

  it('exposes a schemaValidator that rejects invalid metadata', () => {
    expect(() => registration.schemaValidator?.({ index: 123 })).toThrow();
  });

  it('rejects metadata with a non-object rule', () => {
    expect(() => registration.schemaValidator?.({ rule: 'not-an-object' })).toThrow();
  });
});
