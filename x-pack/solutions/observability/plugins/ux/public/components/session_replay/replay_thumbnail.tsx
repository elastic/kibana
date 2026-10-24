/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiIcon, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { extractPageSnapshot } from '../../../common/rum_click_map';
import { PREVIEW_REPLAY_EVENT_PAGE_SIZE } from '../../../common/session_replay_live';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { fetchSessionReplayEvents } from '../../services/rest/session_replay_api';
import { rrwebCanvasReplay } from '../../session_replay/rrweb_canvas_replay';

interface ReplayerInstance {
  pause: (timeOffset?: number) => void;
  destroy: () => void;
}

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
  const scale = Math.min(stageWidth / pageWidth, stageHeight / pageHeight);
  const left = Math.max(0, (stageWidth - pageWidth * scale) / 2);
  const top = Math.max(0, (stageHeight - pageHeight * scale) / 2);
  wrapper.style.transformOrigin = 'top left';
  wrapper.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
  wrapper.style.width = `${pageWidth}px`;
  wrapper.style.height = `${pageHeight}px`;
};

export function ReplayThumbnail({ sessionId, onOpen }: { sessionId: string; onOpen: () => void }) {
  const { euiTheme } = useEuiTheme();
  const { http } = useKibanaServices();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const replayerRef = useRef<ReplayerInstance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const mount = mountRef.current;

    const start = async () => {
      setLoading(true);
      try {
        const response = await fetchSessionReplayEvents({
          http,
          sessionId,
          size: PREVIEW_REPLAY_EVENT_PAGE_SIZE,
        });
        if (cancelled) {
          return;
        }
        const snapshot = extractPageSnapshot(response.events);
        const root = mountRef.current;
        const stage = stageRef.current;
        if (!snapshot || !root || !stage) {
          return;
        }
        const [{ Replayer: ReplayerCtor }] = await Promise.all([
          import('rrweb'),
          import('rrweb/dist/style.css'),
        ]);
        if (cancelled || !mountRef.current || !stageRef.current) {
          return;
        }
        root.innerHTML = '';
        const replayer = new ReplayerCtor(snapshot.events as never[], {
          root,
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
        fitReplayToStage(stageRef.current, snapshot.width, snapshot.height);
      } catch {
        // Overlay still opens the player if the first snapshot cannot be painted.
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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
      if (mount) {
        mount.innerHTML = '';
      }
    };
  }, [http, sessionId]);

  const label = i18n.translate('xpack.ux.sessionDetail.playPreviewAriaLabel', {
    defaultMessage: 'Play replay',
  });

  return (
    <button
      type="button"
      aria-label={label}
      data-test-subj="uxSessionDetailReplayPreview"
      onClick={onOpen}
      css={css`
        display: block;
        position: relative;
        box-sizing: border-box;
        width: 380px;
        max-width: 100%;
        height: 214px;
        padding: 0;
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
        border-radius: ${euiTheme.border.radius.medium};
        overflow: hidden;
        background: ${euiTheme.colors.backgroundBaseSubdued};
        cursor: pointer;

        &:hover .uxReplayThumbOverlay {
          background: rgba(0, 0, 0, 0.28);
        }

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
        ref={stageRef}
        css={css`
          position: absolute;
          inset: 0;
          overflow: hidden;
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
      {loading && (
        <span
          css={css`
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          `}
        >
          <EuiLoadingSpinner size="l" />
        </span>
      )}
      <span
        className="uxReplayThumbOverlay"
        css={css`
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.18);
          transition: background 120ms ease;
        `}
      >
        <span
          css={css`
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: ${euiTheme.size.xxl};
            height: ${euiTheme.size.xxl};
            border-radius: 50%;
            background: ${euiTheme.colors.primary};
          `}
        >
          <EuiIcon type="play" size="l" aria-hidden={true} />
        </span>
      </span>
    </button>
  );
}
