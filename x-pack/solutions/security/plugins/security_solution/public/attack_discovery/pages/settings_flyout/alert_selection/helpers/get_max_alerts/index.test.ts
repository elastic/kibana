/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';
import { getMaxAlerts } from '.';

describe('getMaxAlerts', () => {
  it('returns the default value when maxAlerts is not a number', () => {
    expect(getMaxAlerts('not-a-number')).toBe(DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS);
  });

  it('returns the default value when maxAlerts is a negative number', () => {
    expect(getMaxAlerts('-1')).toBe(DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS);
  });

  it('returns the default value when maxAlerts is zero', () => {
    expect(getMaxAlerts('0')).toBe(DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS);
  });

  it('returns the numeric value when maxAlerts is a positive integer', () => {
    expect(getMaxAlerts('5')).toBe(5);
  });

  it('returns the default value when maxAlerts is a positive decimal', () => {
    expect(getMaxAlerts('5.5')).toBe(DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS);
  });

  it('returns the default value when maxAlerts is an empty string', () => {
    expect(getMaxAlerts('')).toBe(DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS);
  });

  it('returns the default value when maxAlerts is a string with spaces', () => {
    expect(getMaxAlerts('   ')).toBe(DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS);
  });
});
