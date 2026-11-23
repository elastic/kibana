/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparedValue } from '../../common/types/applications';
import type { Formatters } from '../hooks/use_formatters';
import { percentagePointsLabel } from '../labels';

/**
 * How a value's change is shown: as a share of the previous value for counts and rates, or in
 * percentage points for shares, so a crash-free rate going from 98% to 99% reads "+1 pp", not "+1%".
 */
export type ChangeUnit = 'relative' | 'percentagePoints';

/** Which way a change goes as shown: `0` when it rounds to nothing, e.g. 99.9999% to 99.9995%. */
export type ChangeDirection = -1 | 0 | 1;

export interface FormattedChange {
  /** E.g. "+20%", "-1.5 pp" or "0 pp". */
  readonly label: string;
  readonly direction: ChangeDirection;
}

type SignedFormatters = Pick<Formatters, 'formatSignedNumber' | 'formatSignedPercent'>;

/** The change as `format` shows it, and its direction: none when it shows as 0, as its color. */
const toSigned = (
  format: (change: number) => string,
  change: number
): { text: string; direction: ChangeDirection } => {
  const text = format(change);
  if (text === format(0)) {
    return { text, direction: 0 };
  }
  return { text, direction: change > 0 ? 1 : -1 };
};

const relativeChange = ({ value, previous }: ComparedValue): number | null =>
  value !== null && previous !== null && previous !== 0 ? (value - previous) / previous : null;

/** The signed change of a value against the previous period and its direction; `null` when unknown. */
export const formatChange = (
  compared: ComparedValue,
  unit: ChangeUnit,
  { formatSignedNumber, formatSignedPercent }: SignedFormatters
): FormattedChange | null => {
  if (unit === 'percentagePoints') {
    const { delta } = compared;
    if (delta === null) {
      return null;
    }
    const { text, direction } = toSigned(formatSignedNumber, delta * 100);
    return { label: percentagePointsLabel(text), direction };
  }
  const change = relativeChange(compared);
  if (change === null) {
    return null;
  }
  const { text, direction } = toSigned(formatSignedPercent, change);
  return { label: text, direction };
};
