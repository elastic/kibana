/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiRange, EuiSpacer, EuiText } from '@elastic/eui';
import type { AutonomyLevel } from '@kbn/pnd-common';
import * as i18n from '../translations';

// The slider progresses from least to most autonomous.
const AUTONOMY_LEVELS = [
  'manual',
  'assisted',
  'supervised',
] as const satisfies readonly AutonomyLevel[];

const LEVEL_LABEL: Record<AutonomyLevel, string> = {
  manual: i18n.AUTONOMY_MANUAL_OPTION,
  assisted: i18n.AUTONOMY_ASSISTED_OPTION,
  supervised: i18n.AUTONOMY_SUPERVISED_OPTION,
};

export const autonomyLevelFromSliderIndex = (index: number): AutonomyLevel | undefined =>
  AUTONOMY_LEVELS[index];

interface AutonomySliderProps {
  value: AutonomyLevel;
  onChange: (next: AutonomyLevel) => void;
  disabled?: boolean;
}

export const AutonomySlider: React.FC<AutonomySliderProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const index = Math.max(0, AUTONOMY_LEVELS.indexOf(value));

  return (
    <div>
      <EuiRange
        min={0}
        max={AUTONOMY_LEVELS.length - 1}
        step={1}
        value={index}
        onChange={(event) => {
          const next = autonomyLevelFromSliderIndex(Number(event.currentTarget.value));
          if (next) {
            onChange(next);
          }
        }}
        showTicks
        ticks={AUTONOMY_LEVELS.map((level, levelIndex) => ({
          label: LEVEL_LABEL[level],
          value: levelIndex,
        }))}
        aria-label={i18n.AUTONOMY_LEVEL}
        fullWidth
        disabled={disabled}
        data-test-subj="pndWatchAutonomySlider"
      />
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>
          {i18n.selectedAutonomyLevel(LEVEL_LABEL[value])}
        </p>
      </EuiText>
    </div>
  );
};
