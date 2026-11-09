/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiScreenReaderOnly, EuiText, EuiTextColor } from '@elastic/eui';
import { alignEndCss } from './styles';

const INCREASED_BY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.riskScoreChange.increasedBy',
  { defaultMessage: 'Increased by' }
);
const DECREASED_BY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.riskScoreChange.decreasedBy',
  { defaultMessage: 'Decreased by' }
);

export const RiskScoreChangeCell = memo(({ value }: { value: unknown }) => {
  if (typeof value !== 'number') return <div css={alignEndCss}>{'—'}</div>;
  // Compare the displayed (rounded) value so a change that shows as 0.00 isn't flagged as a rise or drop.
  const delta = Number(value.toFixed(2));
  if (delta === 0) {
    return (
      <div css={alignEndCss}>
        <EuiTextColor color="subdued">{'0.00 ='}</EuiTextColor>
      </div>
    );
  }
  const worse = delta > 0;
  // The arrow is decorative, so screen readers get the direction as text.
  return (
    <EuiText size="s" css={alignEndCss}>
      <EuiTextColor color={worse ? 'danger' : 'success'}>
        <EuiScreenReaderOnly>
          <span>{worse ? INCREASED_BY : DECREASED_BY}</span>
        </EuiScreenReaderOnly>
        {` ${worse ? '+' : '-'}${Math.abs(delta).toFixed(2)} `}
        <span aria-hidden={true}>{worse ? '↑' : '↓'}</span>
      </EuiTextColor>
    </EuiText>
  );
});
RiskScoreChangeCell.displayName = 'RiskScoreChangeCell';
