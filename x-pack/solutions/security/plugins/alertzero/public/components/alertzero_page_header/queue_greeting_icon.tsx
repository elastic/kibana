/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css, keyframes } from '@emotion/react';

/**
 * Official AlertZero geometry, copied so the queue greeting can fade the orbit
 * arcs separately. `AlertZeroIcon` stays one component with its original paths.
 * The static icon joins the upper arcs with a relative `m`; the absolute start
 * of the upper-right arc is M11.795 2.072.
 */
const EVENODD_MARK =
  'M8 .016a1.486 1.486 0 0 1 .365 2.925v2.084A2.997 2.997 0 0 1 10.995 8l-.003.153a3 3 0 0 1-.231 1.002l1.826 1.055a1.485 1.485 0 1 1-.382.648l-1.82-1.05a2.99 2.99 0 0 1-2.386 1.19l-.154-.005a3 3 0 0 1-2.22-1.166L3.8 10.88a1.485 1.485 0 0 1-2.722 1.125 1.487 1.487 0 0 1 2.35-1.78l1.815-1.048a3 3 0 0 1-.238-1.025L5 8a3 3 0 0 1 2.612-2.974v-2.09A1.485 1.485 0 0 1 8 .016M2.787 11.019a.487.487 0 1 0-.844.487.487.487 0 0 0 .844-.487m11.09-.18a.487.487 0 1 0-.484.844.487.487 0 0 0 .485-.843M8 6.002a1.998 1.998 0 1 0 0 3.997A1.998 1.998 0 0 0 8 6m0-4.985a.487.487 0 1 0 0 .974.487.487 0 0 0 0-.973';
const BOTTOM_ORBIT =
  'M11.283 14.24A7 7 0 0 1 8 15.053l-.362-.01a7 7 0 0 1-2.976-.833l.642-.793A6 6 0 0 0 8 14.053c.989 0 1.921-.24 2.745-.661z';
const UPPER_LEFT_ORBIT =
  'M4.802 2.878A6.04 6.04 0 0 0 1.955 7.99l-1 .023v-.005A7.04 7.04 0 0 1 4.28 2.023z';
const UPPER_RIGHT_ORBIT =
  'M11.795 2.072a7.04 7.04 0 0 1 3.249 5.925l-1 .006a6.04 6.04 0 0 0-2.835-5.117z';

const TURN_MS = 2300;

const scaleIn = keyframes`
  from { transform: scale(0); }
  to { transform: scale(1); }
`;

const spinOnce = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const glyphOrigin = css`
  transform-box: view-box;
  transform-origin: 8px 8px;
`;

const scaleMotion = css`
  ${glyphOrigin};
  animation: ${scaleIn} 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
`;

const spinMotion = css`
  ${glyphOrigin};
  animation: ${spinOnce} ${TURN_MS}ms linear forwards;
`;

const fadePiece = (delay: string) => css`
  opacity: 0;
  animation: ${fadeIn} 0.7s ease ${delay} forwards;
`;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
};

/**
 * Keeps the animated glyph mounted for one full turn. A load that finishes
 * early must not unmount the svg mid-rotation; 360deg matches the static icon,
 * so the swap back to `AlertZeroIcon` happens only after the turn is holding.
 */
export const useQueueGreetingMotion = (enabled: boolean, isLoading: boolean) => {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const playingOnFirstPaint = enabled && isLoading && !reducedMotion;
  const [runId, setRunId] = useState(playingOnFirstPaint ? 1 : 0);
  const [turnHolding, setTurnHolding] = useState(false);
  const [latched, setLatched] = useState(playingOnFirstPaint);
  const loadStarted = useRef(playingOnFirstPaint);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      loadStarted.current = false;
    }
    if (!enabled || !isLoading || reducedMotion || loadStarted.current) {
      return;
    }
    loadStarted.current = true;
    setRunId((current) => current + 1);
    setTurnHolding(false);
    setLatched(true);
  }, [enabled, isLoading, reducedMotion]);

  useEffect(() => {
    if (latched && turnHolding && !isLoading) {
      setLatched(false);
    }
  }, [latched, turnHolding, isLoading]);

  return {
    showAnimated: enabled && latched && !reducedMotion && !(turnHolding && !isLoading),
    runId,
    onTurnHolding: () => setTurnHolding(true),
  } as const;
};

export const QueueGreetingIcon: React.FC<{
  runId: number;
  onTurnHolding: () => void;
}> = ({ runId, onTurnHolding }) => (
  <svg
    key={runId}
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden={true}
    data-test-subj="alertZeroQueueGreetingIcon"
  >
    <g css={scaleMotion}>
      <g
        css={spinMotion}
        data-test-subj="alertZeroQueueGreetingSpin"
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) {
            return;
          }
          onTurnHolding();
        }}
      >
        <path fillRule="evenodd" clipRule="evenodd" d={EVENODD_MARK} css={fadePiece('0s')} />
        <path d={BOTTOM_ORBIT} css={fadePiece('0.7s')} />
        <path d={UPPER_LEFT_ORBIT} css={fadePiece('0.85s')} />
        <path d={UPPER_RIGHT_ORBIT} css={fadePiece('1s')} />
      </g>
    </g>
  </svg>
);
