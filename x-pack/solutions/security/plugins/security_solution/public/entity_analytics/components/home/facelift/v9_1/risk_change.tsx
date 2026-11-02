/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiTextColor } from '@elastic/eui';

/** Same "[sign][number] [arrow]" grammar as the metric tile change badges. */
const ARROW_UP = '\u{2191}';
const ARROW_DOWN = '\u{2193}';
const NO_CHANGE = '\u{003D}';
const NOT_COMPARABLE = '—';

/**
 * Risk score change in points: red when it went up, green when it went down,
 * grey for no change, and a dash when there is no previous score to compare.
 */
export const RiskChange: React.FC<{ points: number | null; size?: 's' | 'xs' }> = ({
  points,
  size = 's',
}) => {
  if (points == null) {
    return (
      <EuiText size={size}>
        <EuiTextColor color="subdued">{NOT_COMPARABLE}</EuiTextColor>
      </EuiText>
    );
  }

  const color = points > 0 ? 'danger' : points < 0 ? 'success' : 'subdued';
  const sign = points > 0 ? '+' : points < 0 ? '-' : '';
  const arrow = points > 0 ? ARROW_UP : points < 0 ? ARROW_DOWN : NO_CHANGE;

  return (
    <EuiText size={size}>
      <EuiTextColor color={color}>
        {`${sign}${Math.abs(points).toFixed(2)} `}
        <span aria-hidden={true}>{arrow}</span>
      </EuiTextColor>
    </EuiText>
  );
};

/** `null` when the entity had no score before the window (nothing to compare with). */
export const comparableRiskChange = (riskScore: number, points: number): number | null =>
  riskScore - points <= 0 ? null : points;
