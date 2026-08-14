/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import type { RumClickPoint, RumClickMapSnapshot } from '../../../../common/rum_click_map';

interface ReplayerInstance {
  pause: (timeOffset?: number) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => ReplayerInstance;
  destroy: () => void;
}

const STAGE_HEIGHT = 420;

const drawHeatmap = (canvas: HTMLCanvasElement, clicks: RumClickPoint[]): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const maxCount = Math.max(1, ...clicks.map((click) => click.count));
  for (const click of clicks) {
    const intensity = 0.25 + 0.55 * (click.count / maxCount);
    const radius = 28 + 16 * (click.count / maxCount);
    const gradient = ctx.createRadialGradient(click.x, click.y, 0, click.x, click.y, radius);
    gradient.addColorStop(0, `rgba(255, 48, 14, ${intensity})`);
    gradient.addColorStop(0.45, `rgba(255, 176, 32, ${intensity * 0.45})`);
    gradient.addColorStop(1, 'rgba(255, 176, 32, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(click.x, click.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
};

const fitReplayToStage = (stage: HTMLElement, pageWidth: number, pageHeight: number): void => {
  const wrapper = stage.querySelector('.replayer-wrapper') as HTMLElement | null;
  if (!wrapper) {
    return;
  }
  const stageWidth = stage.clientWidth;
  const stageHeight = stage.clientHeight;
  if (stageWidth <= 0 || stageHeight <= 0 || pageWidth <= 0 || pageHeight <= 0) {
    return;
  }
  const scale = Math.min(stageWidth / pageWidth, stageHeight / pageHeight, 1);
  const left = Math.max(0, (stageWidth - pageWidth * scale) / 2);
  const top = Math.max(0, (stageHeight - pageHeight * scale) / 2);
  wrapper.style.transformOrigin = 'top left';
  wrapper.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
  wrapper.style.width = `${pageWidth}px`;
  wrapper.style.height = `${pageHeight}px`;
};

export function ClickMapStage({
  snapshot,
  clicks,
}: {
  snapshot: RumClickMapSnapshot;
  clicks: RumClickPoint[];
}) {
  const { euiTheme } = useEuiTheme();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const replayerRef = useRef<ReplayerInstance | null>(null);

  useEffect(() => {
    let cancelled = false;
    const mount = mountRef.current;
    if (!mount || !stageRef.current) {
      return;
    }

    const start = async () => {
      const [{ Replayer: ReplayerCtor }] = await Promise.all([
        import('rrweb'),
        import('rrweb/dist/style.css'),
      ]);
      if (cancelled || !mountRef.current || !stageRef.current) {
        return;
      }
      mount.innerHTML = '';
      const replayer = new ReplayerCtor(snapshot.events as never[], {
        root: mount,
        skipInactive: true,
        mouseTail: false,
      }) as unknown as ReplayerInstance;
      if (cancelled) {
        try {
          replayer.destroy();
        } catch {
          // ignore
        }
        return;
      }
      replayerRef.current = replayer;
      replayer.pause(0);
      fitReplayToStage(stageRef.current, snapshot.width, snapshot.height);

      const wrapper = mount.querySelector('.replayer-wrapper') as HTMLElement | null;
      if (wrapper) {
        const canvas = document.createElement('canvas');
        canvas.width = snapshot.width;
        canvas.height = snapshot.height;
        canvas.setAttribute('data-test-subj', 'uxClickMapCanvas');
        canvas.style.position = 'absolute';
        canvas.style.inset = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '6';
        wrapper.appendChild(canvas);
        drawHeatmap(canvas, clicks);
      }
    };

    void start();

    const onResize = () => {
      if (stageRef.current) {
        fitReplayToStage(stageRef.current, snapshot.width, snapshot.height);
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      if (replayerRef.current?.destroy) {
        try {
          replayerRef.current.destroy();
        } catch {
          // ignore
        }
      }
      replayerRef.current = null;
      mount.innerHTML = '';
    };
  }, [snapshot, clicks]);

  return (
    <div
      ref={stageRef}
      data-test-subj="uxClickMapStage"
      css={css`
        position: relative;
        z-index: 0;
        height: ${STAGE_HEIGHT}px;
        overflow: hidden;
        background: ${euiTheme.colors.backgroundBaseSubdued};
        isolation: isolate;

        .replayer-wrapper {
          position: absolute !important;
          top: 0;
          left: 0;
          transform-origin: top left;
        }

        iframe {
          border: 0;
          background: #fff;
        }
      `}
    >
      <div
        ref={mountRef}
        css={css`
          position: absolute;
          inset: 0;
        `}
      />
    </div>
  );
}
