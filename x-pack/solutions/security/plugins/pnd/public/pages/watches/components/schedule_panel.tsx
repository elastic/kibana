/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { Watch } from '@kbn/pnd-common';
import * as i18n from '../translations';

interface SchedulePanelProps {
  watch: Watch;
}

export const SchedulePanel: React.FC<SchedulePanelProps> = ({ watch }) => {
  const { euiTheme } = useEuiTheme();
  const { coverage, color } = watch;

  return (
    <EuiPanel hasBorder paddingSize="m">
      {watch.triggers.length > 0 ? (
        <>
          <EuiText size="xs" color="subdued">
            <p>{i18n.WORKFLOW_TRIGGERS_LABEL}</p>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="s" wrap responsive={false}>
            {watch.triggers.map((trigger) => (
              <EuiFlexItem grow={false} key={`${trigger.type}-${trigger.summary}`}>
                <EuiBadge
                  color="hollow"
                  iconType={
                    trigger.type === 'schedule'
                      ? 'clock'
                      : trigger.type === 'event'
                      ? 'bolt'
                      : 'play'
                  }
                >
                  {trigger.summary}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            <p>{i18n.SCHEDULE_PROJECTION_NOTE}</p>
          </EuiText>
          <EuiSpacer size="s" />
        </>
      ) : null}

      <div
        css={css`
          position: relative;
          height: 18px;
          margin: ${euiTheme.size.m} 0 ${euiTheme.size.xs};
          border-radius: ${euiTheme.border.radius.medium};
          background: ${euiTheme.colors.lightestShade};
          overflow: hidden;
        `}
        aria-hidden="true"
      >
        {coverage.map(([from, to], idx) => (
          <i
            key={`${from}-${to}-${idx}`}
            css={css`
              position: absolute;
              top: 3px;
              bottom: 3px;
              left: ${(from / 24) * 100}%;
              width: ${((to - from) / 24) * 100}%;
              border-radius: 3px;
              background: ${color};
              opacity: 0.85;
            `}
          />
        ))}
      </div>
      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
        {['00:00', '06:00', '12:00', '18:00', '24:00'].map((h) => (
          <EuiFlexItem grow={false} key={h}>
            <EuiText size="xs" color="subdued">
              {h}
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
