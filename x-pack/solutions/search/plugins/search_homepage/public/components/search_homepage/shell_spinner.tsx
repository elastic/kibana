/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';

/**
 * Co-located copy of the obs Nightshift `ShellSpinner`. Cross-solution
 * imports from observability are forbidden by Kibana's module visibility
 * rules, so the spinner is duplicated here to keep the visual language
 * of the two Nightshift surfaces (obs + Search) in sync.
 */
const SHELL_SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;

const FRAME_INTERVAL_MS = 80;

interface ShellSpinnerProps {
  size?: number;
  'aria-label'?: string;
}

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
