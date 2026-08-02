/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiRange, EuiSpacer, EuiText } from '@elastic/eui';
import { WATCH_AUTONOMY_LEVELS, type WatchAutonomyLevel } from '@kbn/pnd-common';
import * as i18n from '../settings_translations';

interface AutonomySliderProps {
  current: WatchAutonomyLevel;
  isDisabled?: boolean;
  onChange: (level: WatchAutonomyLevel) => void;
}

/**
 * Slider over the shared autonomy scale. One scale for every watch by design — only the selected
 * level is per-watch. See https://github.com/elastic/security-team/issues/18718.
 *
 * ⛔ There is deliberately no org-guardrails line here — no lock icon, no "View guardrails" link. The
 * 2026-08-17 Watch-settings simplification dropped it from every Watch, and the 2026-08-11 sync's
 * decision 10 had already put guardrails out of MVP scope: a link to a surface that does not exist
 * reads as a feature. The slider and the level copy are what the decision kept.
 */
export const AutonomySlider: React.FC<AutonomySliderProps> = ({
  current,
  isDisabled,
  onChange,
}) => {
  const ticks = useMemo(
    () =>
      WATCH_AUTONOMY_LEVELS.map((level, index) => ({
        value: index,
        label: i18n.autonomyLevelName(level),
      })),
    []
  );

  const currentIndex = Math.max(0, WATCH_AUTONOMY_LEVELS.indexOf(current));
  const description = i18n.AUTONOMY_LEVEL_DESCRIPTIONS[current];

  return (
    <>
      <EuiRange
        min={0}
        max={WATCH_AUTONOMY_LEVELS.length - 1}
        step={1}
        value={currentIndex}
        onChange={(event) => {
          const nextIndex = Number((event.target as HTMLInputElement).value);
          const nextLevel = WATCH_AUTONOMY_LEVELS[nextIndex];
          if (nextLevel && nextLevel !== current) {
            onChange(nextLevel);
          }
        }}
        showTicks
        ticks={ticks}
        disabled={isDisabled}
        fullWidth
        aria-label={i18n.AUTONOMY_RANGE_ARIA_LABEL}
        data-test-subj="pndAutonomySlider"
      />
      {description ? (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" data-test-subj="pndAutonomyDescription">
            <p>{description}</p>
          </EuiText>
        </>
      ) : null}
    </>
  );
};
