/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, type SerializedStyles } from '@emotion/react';
import { hexToRgb, useEuiTheme } from '@elastic/eui';
import React, { useEffect, useRef } from 'react';
import {
  DETECTION_LINE_ARTBOARD_WIDTH,
  DETECTION_LINE_BLEED_ASPECT,
  DETECTION_LINE_CHART_HEIGHT,
  DETECTION_LINE_PLAYBACK,
  DETECTION_LINE_STATIC_FRAME_S,
  detectionLineArtboardHeight,
  renderDetectionLineAt,
  type DetectionLinePalette,
} from './detection_line_preview_render';

export { DETECTION_LINE_BLEED_ASPECT };

/** Matches the prototype setup-detections media column (`BlankIntroBanner`). */
export const DETECTION_SETUP_BANNER_MEDIA_WIDTH_PX = 261;

/** EuiBanner `.euiBanner__media` overrides for the landscape detection chart. */
export const detectionSetupBannerMediaCss: SerializedStyles = css`
  .euiBanner__media {
    --euiBannerMediaSize: unset;
    inline-size: ${DETECTION_SETUP_BANNER_MEDIA_WIDTH_PX}px;
    block-size: auto;
    aspect-ratio: ${DETECTION_LINE_BLEED_ASPECT};
    align-self: flex-start;
  }
`;

type Rgb = readonly [number, number, number];

/** Fallback Borealis vis palette if a theme color cannot be parsed. */
const FALLBACK_TEAL: Rgb = [22, 197, 192];
const FALLBACK_BLUE: Rgb = [97, 162, 255];
const FALLBACK_PINK: Rgb = [238, 114, 166];

const themeColorToRgb = (color: string, fallback: Rgb): Rgb => {
  if (/^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$/.test(color.trim())) {
    const [r, g, b] = hexToRgb(color.trim());
    return [r, g, b];
  }
  return fallback;
};

type DetectionLinePreviewProps = {
  'data-test-subj'?: string;
};

/**
 * Detection setup banner art — a line chart whose line, area and background
 * shift teal → blue → pink as detection rises. Fills its media host (bleed).
 */
export function DetectionLinePreview({
  'data-test-subj': testSubj = 'nightshiftDetectionLinePreview',
}: DetectionLinePreviewProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridColor = euiTheme.colors.borderBaseProminent;
  const dotFill = euiTheme.colors.backgroundBasePlain;
  const teal = euiTheme.colors.vis.euiColorVis0;
  const blue = euiTheme.colors.vis.euiColorVis2;
  const pink = euiTheme.colors.vis.euiColorVis4;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return undefined;
    }

    const dpr = Math.max(2, window.devicePixelRatio || 1);
    const artboardHeight = detectionLineArtboardHeight(0);
    canvas.width = DETECTION_LINE_ARTBOARD_WIDTH * dpr;
    canvas.height = artboardHeight * dpr;
    const off = document.createElement('canvas');
    off.width = canvas.width;
    off.height = Math.ceil((DETECTION_LINE_CHART_HEIGHT + 10) * dpr);
    const octx = off.getContext('2d');
    if (!octx) {
      return undefined;
    }

    const palette: DetectionLinePalette = {
      grid: gridColor,
      dotFill,
      px: DETECTION_LINE_ARTBOARD_WIDTH / DETECTION_SETUP_BANNER_MEDIA_WIDTH_PX,
      line: {
        teal: themeColorToRgb(teal, FALLBACK_TEAL),
        blue: themeColorToRgb(blue, FALLBACK_BLUE),
        pink: themeColorToRgb(pink, FALLBACK_PINK),
      },
    };

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      const shown = Math.min(
        rect.width,
        rect.height * (DETECTION_LINE_ARTBOARD_WIDTH / artboardHeight)
      );
      if (shown > 0) {
        palette.px = DETECTION_LINE_ARTBOARD_WIDTH / shown;
      }
    };

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    const t0 = performance.now();

    const draw = (time = DETECTION_LINE_STATIC_FRAME_S) => {
      renderDetectionLineAt(ctx, octx, off, dpr, palette, time);
    };

    const onResize = () => {
      measure();
      if (reducedMotion) {
        draw();
      }
    };

    measure();
    const observer = new ResizeObserver(onResize);
    observer.observe(canvas);

    if (reducedMotion) {
      draw();
      return () => {
        observer.disconnect();
      };
    }

    const loop = (now: number) => {
      draw(((now - t0) / 1000) * DETECTION_LINE_PLAYBACK);
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [blue, dotFill, gridColor, pink, teal]);

  return (
    <div
      css={css`
        flex-shrink: 0;
        line-height: 0;
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 0;
      `}
      data-test-subj={testSubj}
      aria-hidden={true}
    >
      <canvas
        ref={canvasRef}
        css={css`
          display: block;
          width: 100%;
          position: absolute;
          inset: 0;
          height: 100%;
          object-fit: contain;
          object-position: left bottom;
        `}
      />
    </div>
  );
}
