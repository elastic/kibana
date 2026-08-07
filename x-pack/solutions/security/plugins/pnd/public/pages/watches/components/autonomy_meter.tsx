/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import type { AutonomyLevel } from '@kbn/pnd-common';
import { autonomyLevelLabel } from '../translations';

interface AutonomyMeterProps {
  level: AutonomyLevel;
  showLabel?: boolean;
  color?: string;
}

const AUTONOMY_LEVELS: AutonomyLevel[] = ['manual', 'assisted', 'supervised'];

export const AutonomyMeter: React.FC<AutonomyMeterProps> = ({ level, showLabel = true, color }) => {
  const { euiTheme } = useEuiTheme();
  const accent = color ?? euiTheme.colors.primary;

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
          {AUTONOMY_LEVELS.map((autonomyLevel, index) => (
            <span
              key={autonomyLevel}
              css={css`
                width: 10px;
                height: 4px;
                border-radius: 2px;
                background: ${index <= AUTONOMY_LEVELS.indexOf(level)
                  ? accent
                  : euiTheme.colors.lightShade};
                border: ${autonomyLevel === level ? `1px dashed ${accent}` : 'none'};
              `}
            />
          ))}
        </div>
      </EuiFlexItem>
      {showLabel ? (
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <strong>{autonomyLevelLabel(level)}</strong>
          </EuiText>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
