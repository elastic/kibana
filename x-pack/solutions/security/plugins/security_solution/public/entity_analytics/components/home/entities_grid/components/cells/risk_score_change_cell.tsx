/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiIcon, EuiText, EuiTextColor } from '@elastic/eui';

export const RiskScoreChangeCell = memo(({ value }: { value: unknown }) => {
  if (typeof value !== 'number') return <>{'—'}</>;
  const delta = value;
  if (delta === 0) return <EuiTextColor color="subdued">{'—'}</EuiTextColor>;
  const worse = delta > 0;
  return (
    <EuiText size="s">
      <EuiTextColor color={worse ? 'danger' : 'success'}>
        <EuiIcon type={worse ? 'sortUp' : 'sortDown'} size="s" aria-hidden={true} />
        {` ${Math.abs(Math.round(delta))}%`}
      </EuiTextColor>
    </EuiText>
  );
});
RiskScoreChangeCell.displayName = 'RiskScoreChangeCell';
