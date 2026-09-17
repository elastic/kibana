/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiRangeProps } from '@elastic/eui';
import { EuiFormRow, EuiRange, EuiSpacer, EuiText } from '@elastic/eui';
import type { WatchAutonomyLevel } from '@kbn/alertzero-common';
import * as i18n from '../settings_translations';

interface AutonomySliderProps {
  current: WatchAutonomyLevel;
  /** The Worker's allowed levels, ascending. One level renders as a fixed value, not a slider. */
  levels: readonly WatchAutonomyLevel[];
  isDisabled?: boolean;
  onChange: (level: WatchAutonomyLevel) => void;
}

/**
 * Slider over the shared autonomy scale. One scale for every watch by design — only the selected
 * level and the subset a Worker allows are per-Worker. See
 * https://github.com/elastic/security-team/issues/18718.
 *
 * Fully controlled: every step is a complete level, so each change goes straight to the page
 * draft and the parent's `current` is what renders.
 */
export const AutonomySlider: React.FC<AutonomySliderProps> = ({
  current,
  levels,
  isDisabled,
  onChange,
}) => {
  const onRangeChange = useCallback<NonNullable<EuiRangeProps['onChange']>>(
    (event) => {
      const next =
        levels[Number((event.currentTarget as HTMLInputElement | HTMLButtonElement).value)];
      if (next && next !== current) {
        onChange(next);
      }
    },
    [current, levels, onChange]
  );

  const ticks = useMemo(
    () =>
      levels.map((level, index) => ({
        value: index,
        label: i18n.autonomyLevelName(level),
      })),
    [levels]
  );

  const description = i18n.AUTONOMY_LEVEL_DESCRIPTIONS[current];

  if (levels.length === 1) {
    const [onlyLevel] = levels;
    return (
      <EuiFormRow label={i18n.AUTONOMY_FIXED_LABEL} helpText={i18n.AUTONOMY_FIXED_HELP} fullWidth>
        <EuiText size="s" data-test-subj="alertZeroAutonomyFixed">
          <p>
            <strong>{i18n.autonomyLevelName(onlyLevel)}</strong>
          </p>
          {i18n.AUTONOMY_LEVEL_DESCRIPTIONS[onlyLevel] ? (
            <p>{i18n.AUTONOMY_LEVEL_DESCRIPTIONS[onlyLevel]}</p>
          ) : null}
        </EuiText>
      </EuiFormRow>
    );
  }

  return (
    <>
      <EuiRange
        min={0}
        max={levels.length - 1}
        step={1}
        value={Math.max(0, levels.indexOf(current))}
        onChange={onRangeChange}
        showTicks
        ticks={ticks}
        disabled={isDisabled}
        fullWidth
        aria-label={i18n.AUTONOMY_RANGE_ARIA_LABEL}
        data-test-subj="alertZeroAutonomySlider"
      />
      {description ? (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" data-test-subj="alertZeroAutonomyDescription">
            <p>{description}</p>
          </EuiText>
        </>
      ) : null}
    </>
  );
};
