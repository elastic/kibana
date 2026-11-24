/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFormatters } from '../hooks/use_formatters';
import { createUiSettingsMock } from '../test_utils/ui_settings_mock';
import { formatChange } from './compared_value';

// The changes ignore the default patterns: they show one decimal at most whatever these say.
const formatters = createFormatters(
  createUiSettingsMock({
    'format:number:defaultPattern': '0,0.[000]',
    'format:percent:defaultPattern': '0,0.[000]%',
  })
);

describe('formatChange', () => {
  it('is the change as a share of the previous value, signed, with its direction', () => {
    expect(formatChange({ value: 12, previous: 10, delta: 2 }, 'relative', formatters)).toEqual({
      label: '+20%',
      direction: 1,
      isNegligible: false,
    });
    expect(formatChange({ value: 8, previous: 10, delta: -2 }, 'relative', formatters)).toEqual({
      label: '-20%',
      direction: -1,
      isNegligible: false,
    });
  });

  it('is the change in percentage points for shares', () => {
    expect(
      formatChange({ value: 0.995, previous: 0.98, delta: 0.015 }, 'percentagePoints', formatters)
    ).toEqual({ label: '+1.5 pp', direction: 1, isNegligible: false });
    expect(
      formatChange({ value: 0.98, previous: 0.995, delta: -0.015 }, 'percentagePoints', formatters)
    ).toEqual({ label: '-1.5 pp', direction: -1, isNegligible: false });
  });

  it('rounds the change to one decimal at most', () => {
    expect(
      formatChange({ value: 6453, previous: 6789, delta: -336 }, 'relative', formatters)?.label
    ).toBe('-4.9%');
    expect(
      formatChange(
        { value: 0.42414, previous: 0.41877, delta: 0.00537 },
        'percentagePoints',
        formatters
      )?.label
    ).toBe('+0.5 pp');
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
    ['a count that rounds to 0%', { value: 10001, previous: 10000, delta: 1 }, 'relative', '0%'],
    [
      'a count that rounds down to 0%',
      { value: 9999, previous: 10000, delta: -1 },
      'relative',
      '0%',
    ],
  ] as const)(
    'has no sign nor direction for %s, so it never reads "+0" or shows a color',
    (_, compared, unit, label) => {
      expect(formatChange(compared, unit, formatters)).toEqual({
        label,
        direction: 0,
        isNegligible: true,
      });
    }
  );

  it('has no direction for no change at all', () => {
    expect(formatChange({ value: 10, previous: 10, delta: 0 }, 'relative', formatters)).toEqual({
      label: '0%',
      direction: 0,
      isNegligible: true,
    });
  });

  it.each([
    ['a relative change under 2%', { value: 1015, previous: 1000, delta: 15 }, 'relative', true],
    [
      'a relative change of 2% or more',
      { value: 1020, previous: 1000, delta: 20 },
      'relative',
      false,
    ],
    [
      'a share change under 0.5 pp',
      { value: 0.424, previous: 0.42, delta: 0.004 },
      'percentagePoints',
      true,
    ],
    [
      'a share change of 0.5 pp or more',
      { value: 0.425, previous: 0.42, delta: 0.005 },
      'percentagePoints',
      false,
    ],
  ] as const)(
    'keeps the sign and direction of %s, and says whether it is noise',
    (_, compared, unit, isNegligible: boolean) => {
      const change = formatChange(compared, unit, formatters);
      expect(change?.direction).toBe(1);
      expect(change?.isNegligible).toBe(isNegligible);
    }
  );

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
