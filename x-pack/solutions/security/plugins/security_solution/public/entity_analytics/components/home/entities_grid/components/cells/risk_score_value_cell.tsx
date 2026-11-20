/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { RiskScoreCell } from '../../../entities_table/risk_score_cell';
import { alignEndCss } from './styles';

export const RiskScoreValueCell = memo(({ value }: { value: unknown }) => (
  <div css={alignEndCss}>
    <RiskScoreCell riskScore={typeof value === 'number' ? value : undefined} />
  </div>
));
RiskScoreValueCell.displayName = 'RiskScoreValueCell';
