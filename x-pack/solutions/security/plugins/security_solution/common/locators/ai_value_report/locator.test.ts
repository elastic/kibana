/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AI_VALUE_REPORT_LOCATOR } from '@kbn/deeplinks-analytics';
import { AIValueReportLocatorDefinition, parseLocationState } from './locator';
import { AI_VALUE_PATH, APP_UI_ID } from '../../constants';
import { encode } from '@kbn/rison';
import type { AIValueReportParams } from './locator';

describe('AIValueReportLocatorDefinition', () => {
  const locator = new AIValueReportLocatorDefinition();

  const validParams = {
    timeRange: {
      kind: 'absolute',
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-02T00:00:00Z',
    },
    insight: 'Some valuable insight!',
    reportDataHash: 'abc123',
  } satisfies AIValueReportParams;

  test('id should match constant', () => {
    expect(locator.id).toBe(AI_VALUE_REPORT_LOCATOR);
  });

  test('getLocation returns correct location object', async () => {
    const result = await locator.getLocation(validParams);

    const expectedTimerangeParam = encode({
      valueReport: {
        timerange: validParams.timeRange,
        linkTo: [],
      },
    });

    expect(result).toEqual({
      app: APP_UI_ID,
      path: `${AI_VALUE_PATH}?timerange=${expectedTimerangeParam}`,
      state: validParams,
    });
  });
});

describe('parseLocationState', () => {
  const validState = {
    timeRange: {
      kind: 'absolute',
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-01T00:00:00Z',
    },
    insight: 'Some valuable insight!',
    reportDataHash: 'hash123',
  };

  it('returns parsed state when valid', () => {
    const result = parseLocationState(validState);
    expect(result).toEqual(validState);
  });

  it('strips unknown fields but preserves valid ones', () => {
    const stateWithExtras = {
      ...validState,
      extraField: 'foo',
      anotherOne: 42,
    };

    const result = parseLocationState(stateWithExtras);

    expect(result).toEqual(stateWithExtras);
  });

  it('returns undefined for invalid state (missing fields)', () => {
    const invalid = {
      insight: 'missing timeRange and hash',
    };

    const result = parseLocationState(invalid);
    expect(result).toBeUndefined();
  });
});
