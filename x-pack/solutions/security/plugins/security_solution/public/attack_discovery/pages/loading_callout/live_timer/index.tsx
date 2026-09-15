/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTextProps } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import React, { useEffect, useRef, useState } from 'react';

import { formatDuration } from '../format_duration';
import { getElapsedFromTimestamp } from './helpers/get_elapsed_from_timestamp';

export interface LiveTimerRenderProps {
  formattedDuration: string;
  liveTimeMs: number;
}

export interface LiveTimerProps extends Omit<EuiTextProps, 'children'> {
  /**
   * @deprecated Use `startedAt` instead. This prop is kept for backward compatibility
   * but causes timer resets when the parent component re-renders.
   */
  initialTimeMs?: number;
  isRunning: boolean;
  render?: (props: LiveTimerRenderProps) => React.ReactElement | null;
  /**
   * ISO timestamp when the timer started. This is the preferred way to initialize
   * the timer as it calculates the elapsed time only once on mount, avoiding
   * timer resets during parent re-renders.
   */
  startedAt?: string;
}

const LiveTimerComponent: React.FC<LiveTimerProps> = ({
  'data-test-subj': data_test_subj = 'liveTimer',
  initialTimeMs = 0,
  isRunning,
  render,
  startedAt,
  ...textProps
}) => {
  // Calculate initial elapsed time only once on mount (or when startedAt changes)
  // to avoid timer resets during parent re-renders
  const initialElapsedRef = useRef<number | null>(null);

  if (initialElapsedRef.current === null) {
    initialElapsedRef.current = startedAt ? getElapsedFromTimestamp(startedAt) : initialTimeMs;
  }

  const [liveTimeMs, setLiveTimeMs] = useState<number>(initialElapsedRef.current);

  // Reset the ref and state when startedAt changes (new step started)
  useEffect(() => {
    if (startedAt) {
      const newElapsed = getElapsedFromTimestamp(startedAt);
      initialElapsedRef.current = newElapsed;
      setLiveTimeMs(newElapsed);
    }
  }, [startedAt]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    // Calculate the start time once based on the initial elapsed time
    const startTimeMs = Date.now() - (initialElapsedRef.current ?? 0);
    const intervalId = setInterval(() => {
      setLiveTimeMs(Date.now() - startTimeMs);
    }, 100);

    return () => clearInterval(intervalId);
  }, [isRunning, startedAt]); // Only restart when isRunning or startedAt changes

  const formattedDuration = formatDuration(liveTimeMs);

  if (!formattedDuration) {
    return null;
  }

  if (render != null) {
    return render({ formattedDuration, liveTimeMs });
  }

  return (
    <EuiText data-test-subj={data_test_subj} {...textProps}>
      {formattedDuration}
    </EuiText>
  );
};

LiveTimerComponent.displayName = 'LiveTimer';

export const LiveTimer = React.memo(LiveTimerComponent);
