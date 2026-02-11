/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESSENTIAL_ALERT_FIELDS } from '../../common';
import { stringifyEssentialAlertData } from './helpers';

describe('stringifyEssentialAlertData', () => {
  it('filters to essential fields only', () => {
    const rawData: Record<string, string[]> = {
      [ESSENTIAL_ALERT_FIELDS[0]]: ['value1'],
      [ESSENTIAL_ALERT_FIELDS[1]]: ['value2'],
      nonEssentialField: ['shouldBeExcluded'],
      anotherNonEssential: ['shouldAlsoBeExcluded'],
    };

    const result = stringifyEssentialAlertData(rawData);
    const parsed = JSON.parse(result);

    expect(parsed).toHaveProperty(ESSENTIAL_ALERT_FIELDS[0]);
    expect(parsed).toHaveProperty(ESSENTIAL_ALERT_FIELDS[1]);
    expect(parsed).not.toHaveProperty('nonEssentialField');
    expect(parsed).not.toHaveProperty('anotherNonEssential');
  });

  it('excludes non-essential fields', () => {
    const rawData: Record<string, string[]> = {
      field1: ['value1'],
      field2: ['value2'],
    };

    const result = stringifyEssentialAlertData(rawData);
    const parsed = JSON.parse(result);

    expect(Object.keys(parsed).length).toBe(0);
  });

  it('returns valid JSON string', () => {
    const rawData: Record<string, string[]> = {
      [ESSENTIAL_ALERT_FIELDS[0]]: ['value1'],
    };

    const result = stringifyEssentialAlertData(rawData);

    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual({
      [ESSENTIAL_ALERT_FIELDS[0]]: ['value1'],
    });
  });

  it('handles empty input', () => {
    const rawData: Record<string, string[]> = {};

    const result = stringifyEssentialAlertData(rawData);
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({});
  });
});
