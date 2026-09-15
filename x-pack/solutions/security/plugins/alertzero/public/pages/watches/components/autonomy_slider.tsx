/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
 * EuiRange fires onChange per step while dragging. Persist on pointer release (and immediately for
 * keyboard / tick clicks) so a drag from manual to supervised is one workflow rewrite, not two.
 */
export const AutonomySlider: React.FC<AutonomySliderProps> = ({
  current,
  levels,
  isDisabled,
  onChange,
}) => {
  const [draft, setDraft] = useState(current);
  const draftRef = useRef(current);
  const lastPersistedRef = useRef(current);
  const onChangeRef = useRef(onChange);
  const isPointerDownRef = useRef(false);

  onChangeRef.current = onChange;

  useEffect(() => {
    lastPersistedRef.current = current;
    if (!isPointerDownRef.current) {
      draftRef.current = current;
      setDraft(current);
    }
  }, [current]);

  const persist = useCallback((level: WatchAutonomyLevel) => {
    if (level === lastPersistedRef.current) {
      return;
    }
    lastPersistedRef.current = level;
    onChangeRef.current(level);
  }, []);

  useEffect(() => {
    const onPointerUp = () => {
      if (!isPointerDownRef.current) {
        return;
      }
      isPointerDownRef.current = false;
      persist(draftRef.current);
    };
    window.addEventListener('pointerup', onPointerUp);
    return () => window.removeEventListener('pointerup', onPointerUp);
  }, [persist]);

  const onRangeChange = useCallback<NonNullable<EuiRangeProps['onChange']>>(
    (event) => {
      const nextLevel =
        levels[Number((event.currentTarget as HTMLInputElement | HTMLButtonElement).value)];
      if (!nextLevel) {
        return;
      }
      draftRef.current = nextLevel;
      setDraft(nextLevel);
      if (!isPointerDownRef.current) {
        persist(nextLevel);
      }
    },
    [levels, persist]
  );

  const onPointerDown = useCallback(() => {
    isPointerDownRef.current = true;
  }, []);

  const ticks = useMemo(
    () =>
      levels.map((level, index) => ({
        value: index,
        label: i18n.autonomyLevelName(level),
      })),
    [levels]
  );

  const currentIndex = Math.max(0, levels.indexOf(draft));
  const description = i18n.AUTONOMY_LEVEL_DESCRIPTIONS[draft];

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
        value={currentIndex}
        onChange={onRangeChange}
        onPointerDown={onPointerDown}
        onBlur={() => persist(draftRef.current)}
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
