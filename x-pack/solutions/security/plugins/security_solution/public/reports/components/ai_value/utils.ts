/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { getPercChange } from './helpers';
import * as i18n from './translations';

export const getPercentInfo = ({
  colors,
  colorFamily = 'default',
  currentCount,
  previousCount,
  stat,
  statType,
}: {
  colors?: EuiThemeComputed['colors'];
  colorFamily?: 'default' | 'bright';
  currentCount: number;
  previousCount: number;
  stat: string;
  statType: string;
}) => {
  const percentageChange = getPercChange(currentCount, previousCount) ?? '0.0%';

  const isNegative = percentageChange.charAt(0) === '-';
  const isZero = percentageChange === '0.0%';

  return {
    percent: isNegative || isZero ? percentageChange : `+${percentageChange}`,
    color: isZero
      ? 'hollow'
      : isNegative
      ? colorFamily === 'bright' || !colors
        ? 'danger'
        : colors?.backgroundBaseDanger
      : colorFamily === 'bright' || !colors
      ? 'success'
      : colors?.backgroundBaseSuccess,
    note: isZero
      ? i18n.NO_CHANGE(statType)
      : i18n.STAT_DIFFERENCE({
          upOrDown: isNegative ? i18n.DOWN : i18n.UP,
          percentageChange: isNegative ? percentageChange.substring(1) : percentageChange,
          stat,
          statType,
        }),
  };
};

export const getExcludeAlertsFilters = (alertIds: string[]) => [
  {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
    },
    query: {
      bool: {
        // only query alerts that are not part of an attack discovery
        must_not: alertIds.map((uuid: string) => ({
          match_phrase: { 'kibana.alert.uuid': uuid },
        })),
      },
    },
  },
];
