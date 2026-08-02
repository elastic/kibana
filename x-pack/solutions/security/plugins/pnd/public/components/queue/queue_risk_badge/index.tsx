/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import type { QueueRiskBadgeSize } from '../types';
import * as i18n from '../translations';

const BADGE_SIZE_PX: Readonly<Record<QueueRiskBadgeSize, number>> = {
  m: 40,
  ms: 28,
  s: 20,
};

const BADGE_FONT_PX: Readonly<Record<QueueRiskBadgeSize, number>> = {
  m: 14,
  ms: 12,
  s: 10,
};

export interface QueueRiskBadgeProps {
  score: number;
  /**
   * `m` is the 40px card / thread-header badge (rounded rectangle);
   * `ms` the 28px circle for compact related-conversation lists;
   * `s` the 20px inline circle in nested child rows.
   */
  size?: QueueRiskBadgeSize;
}

/**
 * Leading-indicator score. Shape is size-driven: the card badge is a rounded
 * rectangle (Aug 18); compact child scores stay circular accents.
 */
export const QueueRiskBadge: React.FC<QueueRiskBadgeProps> = ({ score, size = 'm' }) => {
  const { euiTheme } = useEuiTheme();
  const isCardBadge = size === 'm';

  return (
    <span
      aria-label={i18n.riskScoreAriaLabel(score)}
      css={css`
        align-items: center;
        background: ${euiTheme.colors.backgroundLightDanger};
        block-size: ${BADGE_SIZE_PX[size]}px;
        border-radius: ${isCardBadge ? euiTheme.size.s : '50%'};
        color: ${euiTheme.colors.textDanger};
        display: inline-flex;
        flex-shrink: 0;
        font-size: ${BADGE_FONT_PX[size]}px;
        font-variant-numeric: tabular-nums;
        font-weight: ${euiTheme.font.weight.bold};
        inline-size: ${BADGE_SIZE_PX[size]}px;
        justify-content: center;
        line-height: 1;
      `}
      data-test-subj="pndQueueRiskScoreBadge"
    >
      {score}
    </span>
  );
};
