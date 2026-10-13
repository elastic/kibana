/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiScreenReaderOnly, EuiText, EuiTextColor } from '@elastic/eui';

const INCREASED_BY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.riskScoreChange.increasedBy',
  { defaultMessage: 'Increased by' }
);
const DECREASED_BY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.riskScoreChange.decreasedBy',
  { defaultMessage: 'Decreased by' }
);

export const RiskScoreChangeCell = memo(({ value }: { value: unknown }) => {
  if (typeof value !== 'number') return <>{'—'}</>;
  const delta = value;
  if (delta === 0) return <EuiTextColor color="subdued">{'—'}</EuiTextColor>;
  const worse = delta > 0;
  // The arrow is decorative, so screen readers get the direction as text.
  return (
    <EuiText size="s">
      <EuiTextColor color={worse ? 'danger' : 'success'}>
        <EuiIcon type={worse ? 'sortUp' : 'sortDown'} size="s" aria-hidden={true} />
        <EuiScreenReaderOnly>
          <span>{worse ? INCREASED_BY : DECREASED_BY}</span>
        </EuiScreenReaderOnly>
        {` ${Math.abs(Math.round(delta))}%`}
      </EuiTextColor>
    </EuiText>
  );
});
RiskScoreChangeCell.displayName = 'RiskScoreChangeCell';
