/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

import { AxisTick } from '../axis_tick';

const INNER_CIRCLE_LEFT_JUSTIFY_X_OFFSET = 0; // px
const OUTER_CIRCLE_LEFT_JUSTIFY_X_OFFSET = -4; // px

interface Props {
  detected: boolean;
  tactic: string;
}

const TacticComponent: React.FC<Props> = ({ detected, tactic }) => {
  const { euiTheme } = useEuiTheme();

  const WIDTH = 144; // px
  const TICK_COUNT = 12;

  const ticks = useMemo(
    () => (
      <EuiFlexGroup data-tests-subj="ticks" gutterSize="none">
        <div
          css={css`
            overflow: hidden;
            width: ${WIDTH}px;
          `}
        />
        {Array.from({ length: TICK_COUNT }).map((_, i) => (
          <EuiFlexItem key={i} grow={false}>
            <AxisTick />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    ),
    []
  );

  const color = detected ? euiTheme.colors.danger : euiTheme.colors.subduedText;

  return (
    <div
      css={css`
        width: ${WIDTH}px;
      `}
    >
      <EuiFlexGroup data-test-subj="tactic" direction="column" gutterSize="none" wrap={false}>
        <EuiFlexItem
          css={css`
            position: relative;
          `}
          data-test-subj="tics"
          grow={false}
        >
          <div
            // eslint-disable-next-line @kbn/css/no_css_color -- euiTheme.colors.danger is a string
            css={css`
              background: transparent;
              border: 2px solid ${color};
              border-radius: 50%;
              height: 8px;
              position: absolute;
              transform: translate(${INNER_CIRCLE_LEFT_JUSTIFY_X_OFFSET}px, -2px);
              width: 8px;
            `}
            data-test-subj="innerCircle"
          />
          <div
            // eslint-disable-next-line @kbn/css/no_css_color -- euiTheme.colors.danger is a string
            css={css`
              background: transparent;
              border: 2px solid ${color};
              border-radius: 50%;
              height: 16px;
              opacity: ${detected ? 25 : 0}%;
              position: absolute;
              transform: translate(${OUTER_CIRCLE_LEFT_JUSTIFY_X_OFFSET}px, -6px);
              width: 16px;
            `}
            data-test-subj="outerCircle"
          />
          <>{ticks}</>
        </EuiFlexItem>

        <EuiFlexItem
          css={css`
            position: relative;
          `}
          grow={false}
        >
          <EuiSpacer size="s" />
        </EuiFlexItem>

        <EuiFlexItem
          css={css`
            position: relative;
          `}
          grow={false}
        >
          <EuiText color={color} data-test-subj="tacticText" size="xs">
            {tactic}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

TacticComponent.displayName = 'Tactic';

export const Tactic = React.memo(TacticComponent);
