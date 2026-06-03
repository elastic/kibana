/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_ALERT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { getObservabilityAlertType } from '.';

describe('getObservabilityAlertType', () => {
  const registration = getObservabilityAlertType();

  it('registers with the correct id', () => {
    expect(registration.id).toBe(OBSERVABILITY_ALERT_ATTACHMENT_TYPE);
  });

  it('exposes a schemaValidator that accepts valid metadata', () => {
    expect(() =>
      registration.schemaValidator?.({
        index: '.alerts-observability',
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
    expect(() => registration.schemaValidator?.({ rule: 'invalid' })).toThrow();
  });

  it('rejects metadata with a non-string index', () => {
    expect(() => registration.schemaValidator?.({ index: 123 })).toThrow();
  });
});
