/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RumClickPoint, RumClickMapSnapshot } from '../../../../common/rum_click_map';
import { ClickMapHotspotCard } from './click_map_hotspot';
import { clickBinRadius, clickMapStageFit } from './click_map_hit';
import { rrwebCanvasReplay } from '../../../session_replay/rrweb_canvas_replay';

interface ReplayerInstance {
  pause: (timeOffset?: number) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => ReplayerInstance;
  destroy: () => void;
}

const STAGE_HEIGHT = 420;

const sameBin = (a: RumClickPoint | null, b: RumClickPoint | null): boolean =>
  a != null && b != null && a.x === b.x && a.y === b.y;

const drawHeatmap = (canvas: HTMLCanvasElement, clicks: RumClickPoint[]): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const maxCount = Math.max(1, ...clicks.map((click) => click.count));
  for (const click of clicks) {
    const intensity = 0.25 + 0.55 * (click.count / maxCount);
    const radius = clickBinRadius(click.count, maxCount);
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
  const { scale, left, top } = clickMapStageFit(
    stage.clientWidth,
    stage.clientHeight,
    pageWidth,
    pageHeight
  );
  if (stage.clientWidth <= 0 || stage.clientHeight <= 0) {
    return;
  }
  wrapper.style.transformOrigin = 'top left';
  wrapper.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
  wrapper.style.width = `${pageWidth}px`;
  wrapper.style.height = `${pageHeight}px`;
};

export function ClickMapStage({
  snapshot,
  clicks,
  sampledClicks,
  onViewSessions,
}: {
  snapshot: RumClickMapSnapshot;
  clicks: RumClickPoint[];
  sampledClicks: number;
  onViewSessions?: (sessionIds: string[]) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const replayerRef = useRef<ReplayerInstance | null>(null);
  const [fit, setFit] = useState({ scale: 1, left: 0, top: 0 });
  const [hovered, setHovered] = useState<RumClickPoint | null>(null);
  const [pinned, setPinned] = useState<RumClickPoint | null>(null);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);

  const maxCount = useMemo(() => Math.max(1, ...clicks.map((click) => click.count)), [clicks]);
  const hotspots = useMemo(() => [...clicks].sort((a, b) => a.count - b.count), [clicks]);

  const applyFit = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const next = clickMapStageFit(
      stage.clientWidth,
      stage.clientHeight,
      snapshot.width,
      snapshot.height
    );
    setFit((current) =>
      current.scale === next.scale && current.left === next.left && current.top === next.top
        ? current
        : next
    );
    fitReplayToStage(stage, snapshot.width, snapshot.height);
  }, [snapshot.width, snapshot.height]);

  useLayoutEffect(() => {
    applyFit();
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => applyFit());
    observer.observe(stage);
    return () => observer.disconnect();
  }, [applyFit]);

  useEffect(() => {
    setHovered(null);
    setPinned(null);
    setAnchor(null);
  }, [snapshot, clicks]);

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
        ...rrwebCanvasReplay,
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
      applyFit();

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

    return () => {
      cancelled = true;
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
  }, [snapshot, clicks, applyFit]);

  useEffect(() => {
    if (!pinned) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPinned(null);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (flyoutRef.current?.contains(target)) {
        return;
      }
      if (target.closest('[data-test-subj^="uxClickMapHotspot-"]')) {
        return;
      }
      setPinned(null);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [pinned]);

  const showPinned = pinned != null && anchor != null;
  const showHover = hovered != null && pinned == null && anchor != null;
  const flyoutClick = showPinned ? pinned : hovered;
  const flipDown = (anchor?.top ?? 0) < 160;

  const placeAnchor = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setAnchor({ left: rect.left + rect.width / 2, top: rect.top });
  };

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
          pointer-events: none;
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
      <div
        data-test-subj="uxClickMapHitLayer"
        css={css`
          position: absolute;
          left: ${fit.left}px;
          top: ${fit.top}px;
          width: ${snapshot.width * fit.scale}px;
          height: ${snapshot.height * fit.scale}px;
          z-index: 7;
          pointer-events: none;
        `}
      >
        {hotspots.map((click) => {
          const radius = clickBinRadius(click.count, maxCount) * fit.scale;
          return (
            <button
              key={`${click.x}:${click.y}`}
              type="button"
              data-test-subj={`uxClickMapHotspot-${click.x}-${click.y}`}
              aria-label={i18n.translate('xpack.ux.overview.clickMap.hotspotAriaLabel', {
                defaultMessage: '{count, plural, one {# click} other {# clicks}} in this area',
                values: { count: click.count },
              })}
              css={css`
                position: absolute;
                left: ${click.x * fit.scale - radius}px;
                top: ${click.y * fit.scale - radius}px;
                width: ${radius * 2}px;
                height: ${radius * 2}px;
                border-radius: 50%;
                pointer-events: auto;
                background: transparent;
                border: 0;
                padding: 0;
                cursor: pointer;
              `}
              onMouseEnter={(event) => {
                setHovered(click);
                if (!pinned) {
                  placeAnchor(event);
                }
              }}
              onMouseLeave={() => {
                setHovered((current) => (sameBin(current, click) ? null : current));
              }}
              onClick={(event) => {
                event.stopPropagation();
                placeAnchor(event);
                setPinned((current) => (sameBin(current, click) ? null : click));
              }}
            />
          );
        })}
      </div>
      {flyoutClick && (showHover || showPinned) && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={flyoutRef}
              data-test-subj="uxClickMapFlyout"
              css={css`
                position: fixed;
                left: ${anchor?.left ?? 0}px;
                top: ${anchor?.top ?? 0}px;
                transform: ${flipDown
                  ? 'translate(-50%, 8px)'
                  : 'translate(-50%, calc(-100% - 8px))'};
                z-index: ${euiTheme.levels.flyout};
                pointer-events: ${showPinned ? 'auto' : 'none'};
              `}
            >
              <ClickMapHotspotCard
                click={flyoutClick}
                sampledClicks={sampledClicks}
                showSessionsAction={showPinned}
                onViewSessions={onViewSessions}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
