/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const CompactFormattedNumber = ({
  number,
  abbreviateAbove = 999999,
}: {
  number?: number;
  /** numbers higher than the value of this field will be abbreviated using compact notation and have a tooltip displaying the full value */
  abbreviateAbove?: number;
}) => {
  if (!number && number !== 0) {
    return (
      <span>
        {i18n.translate('xpack.csp.compactFormattedNumber.naTitle', {
          defaultMessage: 'N/A',
        })}
      </span>
    );
  }

  if (number <= abbreviateAbove) {
    return <span>{number.toLocaleString()}</span>;
  }

  return (
    <EuiToolTip content={number.toLocaleString()}>
      <span>
        {number.toLocaleString(undefined, {
          notation: 'compact',
          maximumFractionDigits: 1,
        })}
      </span>
    </EuiToolTip>
  );
};
