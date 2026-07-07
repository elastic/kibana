/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiI18nNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

/**
 * Until browser support accomodates the `notation="compact"` feature of Intl.NumberFormat...
 * exported for testing
 * @param num The number to format
 * @returns [mantissa ("12" in "12k+"), Scalar of compact notation (k,M,B,T), remainder indicator ("+" in "12k+")]
 */
export function compactNotationParts(
  num: number
): [mantissa: number, compactNotation: string, remainderIndicator: string] {
  if (!Number.isFinite(num)) {
    return [num, '', ''];
  }

  // "scale" here will be a term indicating how many thousands there are in the number
  // e.g. 1001 will be 1000, 1000002 will be 1000000, etc.
  const scale = Math.pow(10, 3 * Math.min(Math.floor(Math.floor(Math.log10(num)) / 3), 4));

  const compactPrefixTranslations = {
    compactThousands: i18n.translate('xpack.securitySolution.formattedNumber.compactThousands', {
      defaultMessage: 'k',
    }),
    compactMillions: i18n.translate('xpack.securitySolution.formattedNumber.compactMillions', {
      defaultMessage: 'M',
    }),

    compactBillions: i18n.translate('xpack.securitySolution.formattedNumber.compactBillions', {
      defaultMessage: 'B',
    }),

    compactTrillions: i18n.translate('xpack.securitySolution.formattedNumber.compactTrillions', {
      defaultMessage: 'T',
    }),
  };
  const prefixMap: Map<number, string> = new Map([
    [1, ''],
    [1000, compactPrefixTranslations.compactThousands],
    [1000000, compactPrefixTranslations.compactMillions],
    [1000000000, compactPrefixTranslations.compactBillions],
    [1000000000000, compactPrefixTranslations.compactTrillions],
  ]);
  const hasRemainder = i18n.translate('xpack.securitySolution.formattedNumber.compactOverflow', {
    defaultMessage: '+',
  });
  const prefix = prefixMap.get(scale) ?? '';
  return [Math.floor(num / scale), prefix, (num / scale) % 1 > Number.EPSILON ? hasRemainder : ''];
}

const FormattedCountComponent: React.FC<{ count: number | null }> = ({ count }) => {
  const [mantissa, scale, hasRemainder] = useMemo(() => compactNotationParts(count || 0), [count]);

  if (count == null) {
    return null;
  }

  if (count === 0) {
    return <>{0}</>;
  }

  return (
    <FormattedMessage
      id="xpack.securitySolution.formattedNumber.countsLabel"
      description=""
      defaultMessage="{mantissa}{scale}{hasRemainder}"
      values={{ mantissa: <EuiI18nNumber value={mantissa} />, scale, hasRemainder }}
    />
  );
};

export const FormattedCount = React.memo(FormattedCountComponent);
