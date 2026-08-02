/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import * as i18n from '../translations';

/** The prototype's badge, sized so a two-digit score sits centred without crowding its corners. */
const BADGE_SIZE_PX = 40;
const SCORE_FONT_SIZE_PX = 14;

export interface RiskScoreBadgeProps {
  /** MAX of the constituent detection alerts' `kibana.alert.risk_score`, 0-100 (D5). */
  score: number;
}

/**
 * The row's risk badge (annotation 5).
 *
 * A **rounded rectangle, not a circle**, since the 2026-08-18 design decision *"Queue score badges as
 * rounded rectangles"*: *"Homepage queue-card risk scores (40px) are rounded rectangles instead of
 * circles, matching Nightshift's score-badge shape; compact 28px/20px child-list scores stay circular
 * accents."* PND draws only the 40px card badge, and there is no compact child-row rendering here (the
 * queue's investigation groups draw full cards, `#59`), so the circle has no surviving caller and the
 * radius is not a prop.
 *
 * It renders whatever score it is given, **including zero**, because zero is a real measurement of
 * the constituent alerts. Whether a score exists at all is the row's decision: a run with no
 * correlated Attack Discovery, or one whose alerts have aged out, has nothing to measure and gets
 * no badge — not a zero, and not a placeholder.
 */
export const RiskScoreBadge: React.FC<RiskScoreBadgeProps> = ({ score }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      aria-label={i18n.riskScoreAriaLabel(score)}
      css={css`
        align-items: center;
        background: ${euiTheme.colors.backgroundLightDanger};
        block-size: ${BADGE_SIZE_PX}px;
        border-radius: ${euiTheme.size.s};
        color: ${euiTheme.colors.textDanger};
        display: inline-flex;
        flex-shrink: 0;
        font-size: ${SCORE_FONT_SIZE_PX}px;
        font-weight: ${euiTheme.font.weight.bold};
        inline-size: ${BADGE_SIZE_PX}px;
        justify-content: center;
        line-height: 1;
      `}
      data-test-subj="pndRiskScoreBadge"
    >
      {score}
    </span>
  );
};
