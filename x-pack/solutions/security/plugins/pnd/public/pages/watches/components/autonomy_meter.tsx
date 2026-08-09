/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { WATCH_AUTONOMY_LEVELS, type WatchAutonomyLevel } from '@kbn/pnd-common';
import * as i18n from '../settings_translations';

interface AutonomyMeterProps {
  /** Undefined while the watch's settings are still loading. */
  level: WatchAutonomyLevel | undefined;
  showLabel?: boolean;
  color?: string;
}

const EM_DASH = '—';

/**
 * Compact read-only version of the settings page's autonomy slider, for the Overview cards.
 *
 * Steps come from the shared `WATCH_AUTONOMY_LEVELS` scale, so this and the slider can never
 * disagree about how many levels exist or what they are called.
 */
export const AutonomyMeter: React.FC<AutonomyMeterProps> = ({ level, showLabel = true, color }) => {
  const { euiTheme } = useEuiTheme();
  const accent = color ?? euiTheme.colors.primary;
  const activeIndex = level ? WATCH_AUTONOMY_LEVELS.indexOf(level) : -1;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <div
          css={css`
            display: flex;
            gap: 3px;
            align-items: center;
          `}
          aria-hidden="true"
        >
          {WATCH_AUTONOMY_LEVELS.map((stepLevel, index) => (
            <span
              key={stepLevel}
              css={css`
                width: 10px;
                height: 4px;
                border-radius: 2px;
                background: ${index <= activeIndex ? accent : euiTheme.colors.lightShade};
              `}
            />
          ))}
        </div>
      </EuiFlexItem>
      {showLabel ? (
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <strong>{level ? i18n.autonomyLevelName(level) : EM_DASH}</strong>
          </EuiText>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
