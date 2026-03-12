/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface TacticVerticalRowProps {
  tactic: string;
  detected: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

const RAIL_WIDTH = 24; // keeps marker aligned across rows
const ROW_HEIGHT = 36;

export const TacticVerticalRow = memo(
  ({ tactic, detected, isFirst = false, isLast = false }: TacticVerticalRowProps) => {
    const { euiTheme } = useEuiTheme();

    const styles = useMemo(() => {
      const markerColor = detected ? euiTheme.colors.danger : euiTheme.colors.textSubdued;

      return {
        markerColor,
        lineColor: euiTheme.colors.borderBaseSubdued,

        row: css`
          position: relative;
        `,
        rail: css`
          position: relative;
          width: ${RAIL_WIDTH}px;
          height: ${ROW_HEIGHT}px;
          margin: 1px 0;
          display: flex;
          align-items: center;
          justify-content: center;
        `,
        dashedLine: css`
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: ${isFirst ? '50%' : '0'};
          bottom: ${isLast ? '50%' : '0'};
          border-left: 2px dashed ${euiTheme.colors.borderBaseSubdued};
          z-index: ${euiTheme.levels.content};
        `,
        outerHalo: css`
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid ${markerColor};
          opacity: ${detected ? 0.25 : 0};
          z-index: ${euiTheme.levels.flyout};
        `,
        innerDot: css`
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid ${markerColor};
          background: transparent;
          z-index: ${euiTheme.levels.content};
        `,
        text: css`
          font-weight: ${detected ? euiTheme.font.weight.semiBold : euiTheme.font.weight.regular};
          white-space: nowrap;
        `,
      };
    }, [detected, euiTheme, isFirst, isLast]);

    return (
      <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center" css={styles.row}>
        <EuiFlexItem grow={false}>
          <div css={styles.rail}>
            {/* Dashed line */}
            <div css={styles.dashedLine} data-test-subj="dashedLine" />
            {/* Subtle emphasis only for detected tactics */}
            <div css={styles.outerHalo} data-test-subj="outerCircle" />

            <div css={styles.innerDot} data-test-subj="innerCircle" />
          </div>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText
            css={styles.text}
            color={styles.markerColor}
            data-test-subj="tacticText"
            size="xs"
          >
            {tactic}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

TacticVerticalRow.displayName = 'TacticVerticalRow';
