/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFormatters } from '../hooks/use_formatters';
import { createUiSettingsMock } from '../test_utils/ui_settings_mock';
import { formatChange } from './compared_value';

const formatters = createFormatters(
  createUiSettingsMock({
    'format:number:defaultPattern': '0.[0]',
    'format:percent:defaultPattern': '0%',
  })
);

describe('formatChange', () => {
  it('is the change as a share of the previous value, signed, with its direction', () => {
    expect(formatChange({ value: 12, previous: 10, delta: 2 }, 'relative', formatters)).toEqual({
      label: '+20%',
      direction: 1,
    });
    expect(formatChange({ value: 8, previous: 10, delta: -2 }, 'relative', formatters)).toEqual({
      label: '-20%',
      direction: -1,
    });
  });

  it('is the change in percentage points for shares', () => {
    expect(
      formatChange({ value: 0.995, previous: 0.98, delta: 0.015 }, 'percentagePoints', formatters)
    ).toEqual({ label: '+1.5 pp', direction: 1 });
    expect(
      formatChange({ value: 0.98, previous: 0.995, delta: -0.015 }, 'percentagePoints', formatters)
    ).toEqual({ label: '-1.5 pp', direction: -1 });
  });

  it.each([
    // A crash-free rate from 99.9999% to 99.9995%: -0.0004 pp, which rounds to 0.
    [
      'a share that rounds to 0 pp',
      { value: 0.999995, previous: 0.999999, delta: -0.000004 },
      'percentagePoints',
      '0 pp',
    ],
    [
      'a share that rounds up to 0 pp',
      { value: 0.999999, previous: 0.999995, delta: 0.000004 },
      'percentagePoints',
      '0 pp',
    ],
    ['a count that rounds to 0%', { value: 1001, previous: 1000, delta: 1 }, 'relative', '0%'],
    ['a count that rounds down to 0%', { value: 999, previous: 1000, delta: -1 }, 'relative', '0%'],
  ] as const)(
    'has no sign nor direction for %s, so it never reads "+0" or shows a color',
    (_, compared, unit, label) => {
      expect(formatChange(compared, unit, formatters)).toEqual({ label, direction: 0 });
    }
  );

  it('has no direction for no change at all', () => {
    expect(formatChange({ value: 10, previous: 10, delta: 0 }, 'relative', formatters)).toEqual({
      label: '0%',
      direction: 0,
    });
  });

  it('keeps the sign of a change that only shows once rounded, e.g. "+0.5%"', () => {
    const precise = createFormatters(
      createUiSettingsMock({ 'format:percent:defaultPattern': '0.[0]%' })
    );
    expect(formatChange({ value: 1005, previous: 1000, delta: 5 }, 'relative', precise)).toEqual({
      label: '+0.5%',
      direction: 1,
    });
  });

  it('is unknown without a previous value, or against 0', () => {
    expect(
      formatChange({ value: 12, previous: null, delta: null }, 'relative', formatters)
    ).toBeNull();
    expect(formatChange({ value: 12, previous: 0, delta: 12 }, 'relative', formatters)).toBeNull();
    expect(
      formatChange({ value: null, previous: 3, delta: null }, 'percentagePoints', formatters)
    ).toBeNull();
  });
});
