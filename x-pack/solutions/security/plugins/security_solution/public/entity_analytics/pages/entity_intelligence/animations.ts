/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import type { SerializedStyles } from '@emotion/react';

const REDUCED_MOTION_QUERY = '@media (prefers-reduced-motion: reduce)';

const COUNT_UP_DURATION_MS = 700;

/**
 * Animates a number from its previous value to `target` with an ease-out rAF
 * interpolation. Respects `prefers-reduced-motion` by snapping instantly.
 */
export const useCountUp = (target: number | undefined): number | undefined => {
  const [display, setDisplay] = useState<number | undefined>(undefined);
  const previousRef = useRef<number>(0);

  useEffect(() => {
    if (target === undefined) {
      setDisplay(undefined);
      return;
    }
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const from = previousRef.current;
    previousRef.current = target;

    if (prefersReducedMotion || from === target) {
      setDisplay(target);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_UP_DURATION_MS);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return display;
};

const enterKeyframes = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

/** Staggered entrance animation; pass the item's index for the delay. */
export const staggeredEntrance = (index: number): SerializedStyles => css`
  animation: ${enterKeyframes} 320ms ease-out both;
  animation-delay: ${Math.min(index, 8) * 55}ms;

  ${REDUCED_MOTION_QUERY} {
    animation: none;
  }
`;

const fadeInKeyframes = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

/** Cross-fade + slight slide for tab content switches. */
export const tabTransition = css`
  animation: ${fadeInKeyframes} 200ms ease-out both;

  ${REDUCED_MOTION_QUERY} {
    animation: none;
  }
`;

const slideInKeyframes = keyframes`
  from { opacity: 0; transform: translateX(24px); }
  to { opacity: 1; transform: translateX(0); }
`;

/** Slide-in for the dossier detail surface. */
export const dossierSlideIn = css`
  animation: ${slideInKeyframes} 260ms cubic-bezier(0.16, 1, 0.3, 1) both;

  ${REDUCED_MOTION_QUERY} {
    animation: none;
  }
`;

/** Subtle lift on hover for interactive cards. */
export const hoverLift = (euiTheme: EuiThemeComputed): SerializedStyles => css`
  transition: transform 180ms ease-out, box-shadow 180ms ease-out, border-color 180ms ease-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 14px ${euiTheme.colors.shadow}22;
  }

  ${REDUCED_MOTION_QUERY} {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

const drawKeyframes = keyframes`
  from { stroke-dashoffset: var(--edge-length, 200); }
  to { stroke-dashoffset: 0; }
`;

/** Animated edge drawing for SVG lines (uses stroke-dashoffset). */
export const edgeDraw = css`
  stroke-dasharray: var(--edge-length, 200);
  animation: ${drawKeyframes} 480ms ease-out both;

  ${REDUCED_MOTION_QUERY} {
    animation: none;
    stroke-dasharray: none;
  }
`;

const flowKeyframes = keyframes`
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -24; }
`;

/**
 * Subtle directional flow along an edge (source→target), conveyed by a small
 * repeating dash that marches toward the target. Rendered as an overlay stroke
 * so it does not fight the draw-on dash array. No motion when reduced-motion is
 * requested — the overlay simply holds still.
 */
export const edgeFlow = css`
  stroke-dasharray: 5 19;
  animation: ${flowKeyframes} 900ms linear infinite;

  ${REDUCED_MOTION_QUERY} {
    animation: none;
  }
`;

const popKeyframes = keyframes`
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
`;

/** Pop-in for graph nodes; pass index for a staggered orbit reveal. */
export const nodePop = (index: number): SerializedStyles => css`
  animation: ${popKeyframes} 340ms cubic-bezier(0.34, 1.4, 0.64, 1) both;
  animation-delay: ${120 + Math.min(index, 12) * 40}ms;
  transform-origin: center;
  transform-box: fill-box;

  ${REDUCED_MOTION_QUERY} {
    animation: none;
  }
`;

const timelineStepKeyframes = keyframes`
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
`;

/**
 * Draw-in for a single waterfall step; pass the step index so the chain reveals
 * top-to-bottom. Caps the stagger so long timelines still settle quickly.
 */
export const timelineStepEntrance = (index: number): SerializedStyles => css`
  animation: ${timelineStepKeyframes} 300ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: ${Math.min(index, 14) * 45}ms;

  ${REDUCED_MOTION_QUERY} {
    animation: none;
  }
`;
