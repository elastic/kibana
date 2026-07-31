/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatStepName, STEP_DISPLAY_NAMES } from '.';

describe('STEP_DISPLAY_NAMES', () => {
  it('maps generate_discoveries to "Generation"', () => {
    expect(STEP_DISPLAY_NAMES.generate_discoveries).toBe('Generation');
  });

  it('maps promote_discoveries to "Validation" (backward compat)', () => {
    expect(STEP_DISPLAY_NAMES.promote_discoveries).toBe('Validation');
  });

  it('maps retrieve_alerts to "Alert retrieval"', () => {
    expect(STEP_DISPLAY_NAMES.retrieve_alerts).toBe('Alert retrieval');
  });

  it('maps validate_discoveries to "Validation"', () => {
    expect(STEP_DISPLAY_NAMES.validate_discoveries).toBe('Validation');
  });
});

describe('formatStepName', () => {
  it('returns the display name for a known step ID', () => {
    expect(formatStepName('generate_discoveries')).toBe('Generation');
  });

  it('returns title case for an unknown step ID with underscores', () => {
    expect(formatStepName('retrieve_security_alerts')).toBe('Retrieve Security Alerts');
  });

  it('returns title case for an unknown single-word step ID', () => {
    expect(formatStepName('analyze')).toBe('Analyze');
  });

  it('returns the mapped name for retrieve_alerts', () => {
    expect(formatStepName('retrieve_alerts')).toBe('Alert retrieval');
  });

  it('returns the mapped name for validate_discoveries', () => {
    expect(formatStepName('validate_discoveries')).toBe('Validation');
  });
});
