/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';

/**
 * Classic "spinner braille frames" used by shell/CLI progress indicators
 * (ora, indicatif, cliui, …). Cycling through these on a fixed interval
 * produces the familiar terminal "job running" dot animation.
 */
const SHELL_SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;

const FRAME_INTERVAL_MS = 80;

interface ShellSpinnerProps {
  /** Render size (px) — controls font-size and box dimensions. Defaults to 24. */
  size?: number;
  /** Optional aria-label override. Defaults to "Loading". */
  'aria-label'?: string;
}

/**
 * Tiny terminal-style spinner: cycles through the braille frames used by
 * Node CLI spinners (`ora` et al.) at ~80ms per frame. Used by the
 * Nightshift "analyzing" view in place of an EUI loading spinner so the
 * page reads as "a job is running in the background".
 */
export const ShellSpinner: React.FC<ShellSpinnerProps> = ({
  size = 24,
  'aria-label': ariaLabel = 'Loading',
}) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFrameIndex((i) => (i + 1) % SHELL_SPINNER_FRAMES.length);
    }, FRAME_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuetext={ariaLabel}
      css={css`
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: ${size}px;
        height: ${size}px;
        font-size: ${size}px;
        line-height: 1;
        font-family: 'SF Mono', 'Monaco', 'Cascadia Mono', 'Roboto Mono', monospace;
        font-variant-numeric: tabular-nums;
      `}
    >
      {SHELL_SPINNER_FRAMES[frameIndex]}
    </span>
  );
};
