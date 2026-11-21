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

const withSign = (formatted: string, change: number): string =>
  change > 0 ? `+${formatted}` : formatted;

const relativeChange = ({ value, previous }: ComparedValue): number | null =>
  value !== null && previous !== null && previous !== 0 ? (value - previous) / previous : null;

/** The signed change of a value against the previous period, e.g. "+20%" or "-1.5 pp"; `null` when unknown. */
export const formatChange = (
  compared: ComparedValue,
  unit: ChangeUnit,
  { formatNumber, formatPercent }: Pick<Formatters, 'formatNumber' | 'formatPercent'>
): string | null => {
  if (unit === 'percentagePoints') {
    const { delta } = compared;
    return delta === null
      ? null
      : percentagePointsLabel(withSign(formatNumber(delta * 100), delta));
  }
  const change = relativeChange(compared);
  return change === null ? null : withSign(formatPercent(change), change);
};
