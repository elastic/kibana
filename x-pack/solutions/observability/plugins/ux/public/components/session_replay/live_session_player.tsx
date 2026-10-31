/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHistory } from 'react-router-dom';
import type { HttpStart } from '@kbn/core/public';
import { pushRumPath } from '../../utils/rum_search';
import {
  clampReplayOffsetMs,
  collectReplayEventPages,
  formatReplayClock,
  hasLiveReplaySeed,
  isAtLiveEdge,
  isPlayableRrwebEvent,
  LIVE_EVENT_PAGE_SIZE,
  LIVE_SEEK_BACK_MS,
  livePlayFromMs,
} from '../../../common/session_replay_live';
import { fetchSessionReplayEvents } from '../../services/rest/session_replay_api';
import { rrwebCanvasReplay } from '../../session_replay/rrweb_canvas_replay';

interface ReplayerInstance {
  play: (timeOffset?: number) => void;
  pause: (timeOffset?: number) => void;
  addEvent: (event: unknown) => void;
  getCurrentTime: () => number;
  getMetaData: () => { startTime: number; endTime: number; totalTime: number };
  on: (event: string, handler: (...args: unknown[]) => void) => ReplayerInstance;
  destroy: () => void;
}

interface ReplayEventLike {
  type?: number;
  timestamp?: number;
  data?: { href?: string; width?: number; height?: number };
}

interface Props {
  http: HttpStart;
  sessionId: string;
  pollMs: number;
  active: boolean;
}

const STAGE_HEIGHT = 360;

const flushRrwebAdds = async (): Promise<void> => {
  await Promise.resolve();
};

export function LiveSessionPlayer({ http, sessionId, pollMs, active }: Props) {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const replayerRef = useRef<ReplayerInstance | null>(null);
  const cursorRef = useRef<number | null>(null);
  const bufferRef = useRef<ReplayEventLike[]>([]);
  const eventsRef = useRef<ReplayEventLike[]>([]);
  const seededRef = useRef(false);
  const inFlightRef = useRef(false);
  const followingLiveRef = useRef(true);
  const playingRef = useRef(false);
  const tickRef = useRef<() => Promise<void>>(async () => undefined);

  const [status, setStatus] = useState<'waiting' | 'ready' | 'error'>('waiting');
  const [error, setError] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [followingLive, setFollowingLive] = useState(true);
  const [buffering, setBuffering] = useState(false);

  const styles = useMemo(
    () => ({
      stageWrap: css`
        position: relative;
        z-index: 0;
        height: ${STAGE_HEIGHT}px;
        overflow: hidden;
        background: #0b0f14;
        isolation: isolate;
        border-radius: ${euiTheme.border.radius.medium};

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
      `,
      mount: css`
        position: absolute;
        inset: 0;
      `,
      bufferingOverlay: css`
        position: absolute;
        inset: 0;
        z-index: 5;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: ${euiTheme.size.s};
        background: rgba(11, 15, 20, 0.45);
        pointer-events: none;
      `,
      controls: css`
        margin-top: ${euiTheme.size.s};
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
      `,
      timeline: css`
        position: relative;
        height: 8px;
        margin: 2px 0;
        border-radius: 999px;
        background: ${euiTheme.colors.lightShade};
        cursor: pointer;
      `,
      played: css`
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        border-radius: 999px;
        background: ${euiTheme.colors.primary};
        pointer-events: none;
      `,
      cursor: css`
        position: absolute;
        top: 50%;
        width: 12px;
        height: 12px;
        margin-left: -6px;
        margin-top: -6px;
        border-radius: 50%;
        background: ${euiTheme.colors.primary};
        box-shadow: 0 0 0 2px ${euiTheme.colors.backgroundBasePlain};
        pointer-events: none;
        z-index: 3;
      `,
      metaRow: css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.s};
        min-height: 32px;
      `,
      clock: css`
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        white-space: nowrap;
      `,
      metaSpacer: css`
        flex: 1 1 auto;
        min-width: 8px;
      `,
    }),
    [euiTheme]
  );

  const destroyPlayer = useCallback(() => {
    try {
      replayerRef.current?.destroy();
    } catch {
      // rrweb throws if the wrapper was already detached
    }
    replayerRef.current = null;
  }, []);

  const syncProgress = useCallback((replayer: ReplayerInstance) => {
    const total = Math.max(replayer.getMetaData().totalTime || 0, 0);
    const current = clampReplayOffsetMs(replayer.getCurrentTime(), total);
    setCurrentMs(current);
    setTotalMs(total);
    return { current, total };
  }, []);

  const fitReplayToStage = useCallback((pageWidth?: number, pageHeight?: number) => {
    const stage = containerRef.current;
    const wrapper = stage?.querySelector('.replayer-wrapper') as HTMLElement | null;
    if (!stage || !wrapper) {
      return;
    }
    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    if (stageWidth <= 0 || stageHeight <= 0) {
      return;
    }
    const iframe = wrapper.querySelector('iframe') as HTMLIFrameElement | null;
    const width =
      pageWidth ||
      Number(iframe?.width) ||
      iframe?.offsetWidth ||
      wrapper.offsetWidth ||
      stageWidth;
    const height =
      pageHeight ||
      Number(iframe?.height) ||
      iframe?.offsetHeight ||
      wrapper.offsetHeight ||
      stageHeight;
    if (!width || !height) {
      return;
    }
    const scale = Math.min(stageWidth / width, stageHeight / height, 1);
    const left = Math.max(0, (stageWidth - width * scale) / 2);
    const top = Math.max(0, (stageHeight - height * scale) / 2);
    wrapper.style.transformOrigin = 'top left';
    wrapper.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
    wrapper.style.width = `${width}px`;
    wrapper.style.height = `${height}px`;
  }, []);

  const markLiveEdge = useCallback(
    (replayer: ReplayerInstance) => {
      followingLiveRef.current = true;
      playingRef.current = false;
      setFollowingLive(true);
      setPlaying(false);
      setBuffering(true);
      const { total } = syncProgress(replayer);
      setCurrentMs(total);
    },
    [syncProgress]
  );

  const startPlayer = useCallback(
    async (seed: ReplayEventLike[]) => {
      const [{ Replayer: ReplayerCtor }] = await Promise.all([
        import('rrweb'),
        import('rrweb/dist/style.css'),
      ]);
      if (!containerRef.current) {
        return;
      }
      destroyPlayer();
      const replayer = new ReplayerCtor(seed, {
        root: containerRef.current,
        // liveMode ignores PLAY/PAUSE, so seek-back cannot work there
        liveMode: false,
        useVirtualDom: false,
        skipInactive: false,
        mouseTail: false,
        ...rrwebCanvasReplay,
      }) as unknown as ReplayerInstance;
      replayer.on('resize', (raw) => {
        const size = raw as { width?: number; height?: number };
        fitReplayToStage(size.width, size.height);
      });
      replayer.on('event-cast', (raw) => {
        const event = raw as ReplayEventLike;
        if (event.type === 4 && event.data?.href) {
          setPageUrl(event.data.href);
        }
        if (event.type === 4 && event.data?.width && event.data?.height) {
          fitReplayToStage(event.data.width, event.data.height);
        }
        syncProgress(replayer);
      });
      replayer.on('finish', () => {
        markLiveEdge(replayer);
      });
      eventsRef.current = seed;
      const total = Math.max(replayer.getMetaData().totalTime || 0, 0);
      // timestamp < baseline is sync; +1 includes the last event
      replayer.pause(total + 1);
      replayerRef.current = replayer;
      seededRef.current = true;
      followingLiveRef.current = true;
      playingRef.current = false;
      setStatus('ready');
      setEventCount(seed.length);
      setTotalMs(total);
      setCurrentMs(total);
      setFollowingLive(true);
      setPlaying(false);
      setBuffering(true);
      requestAnimationFrame(() => {
        const firstMeta = seed.find((event) => event.type === 4);
        fitReplayToStage(firstMeta?.data?.width, firstMeta?.data?.height);
      });
    },
    [destroyPlayer, fitReplayToStage, markLiveEdge, syncProgress]
  );

  const seekTo = useCallback((offsetMs: number, shouldPlay: boolean) => {
    const replayer = replayerRef.current;
    if (!replayer) {
      return;
    }
    const total = Math.max(replayer.getMetaData().totalTime || 0, 0);
    const offset = clampReplayOffsetMs(offsetMs, total);
    const atEdge = isAtLiveEdge(offset, total);
    followingLiveRef.current = atEdge;
    setFollowingLive(atEdge);
    setTotalMs(total);
    setCurrentMs(offset);
    if (atEdge || !shouldPlay) {
      replayer.pause(atEdge ? total + 1 : offset);
      playingRef.current = false;
      setPlaying(false);
      setBuffering(atEdge);
      return;
    }
    setBuffering(false);
    playingRef.current = true;
    setPlaying(true);
    replayer.play(offset);
  }, []);

  useEffect(() => {
    cursorRef.current = null;
    bufferRef.current = [];
    eventsRef.current = [];
    seededRef.current = false;
    followingLiveRef.current = true;
    playingRef.current = false;
    setStatus('waiting');
    setError(null);
    setEventCount(0);
    setPageUrl(null);
    setCurrentMs(0);
    setTotalMs(0);
    setPlaying(false);
    setFollowingLive(true);
    setBuffering(false);
    destroyPlayer();
  }, [sessionId, destroyPlayer]);

  useEffect(() => {
    let cancelled = false;

    tickRef.current = async () => {
      if (!active || inFlightRef.current || cancelled) {
        return;
      }
      inFlightRef.current = true;
      try {
        if (!seededRef.current) {
          const collected = await collectReplayEventPages(
            async (afterEvent) => {
              const response = await fetchSessionReplayEvents({
                http,
                sessionId,
                afterEvent,
                size: LIVE_EVENT_PAGE_SIZE,
              });
              return {
                events: response.events,
                hitCount: response.hitCount ?? response.events.length,
                pageFull: Boolean(response.truncated),
                lastCompleteEvent: response.lastCompleteEvent,
              };
            },
            {
              shouldStop: (events) =>
                hasLiveReplaySeed((events as ReplayEventLike[]).filter(isPlayableRrwebEvent)),
            }
          );
          if (cancelled) {
            return;
          }
          if (collected.lastCompleteEvent != null) {
            cursorRef.current = collected.lastCompleteEvent;
          }
          const playable = (collected.events as ReplayEventLike[]).filter(isPlayableRrwebEvent);
          setError(null);
          setStatus('waiting');
          bufferRef.current = bufferRef.current.concat(playable);
          setEventCount(bufferRef.current.length);
          if (hasLiveReplaySeed(bufferRef.current) && containerRef.current) {
            const seed = bufferRef.current;
            bufferRef.current = [];
            await startPlayer(seed);
          }
          return;
        }

        const afterEvent = cursorRef.current ?? undefined;
        const response = await fetchSessionReplayEvents({
          http,
          sessionId,
          afterEvent,
          size: LIVE_EVENT_PAGE_SIZE,
        });
        if (cancelled) {
          return;
        }
        if (response.lastCompleteEvent != null) {
          cursorRef.current = response.lastCompleteEvent;
        }
        const playable = (response.events as ReplayEventLike[]).filter(isPlayableRrwebEvent);
        setError(null);

        const replayer = replayerRef.current;
        if (!replayer || playable.length === 0) {
          return;
        }
        const firstNew = playable[0];
        for (const event of playable) {
          eventsRef.current.push(event);
          replayer.addEvent(event);
        }
        await flushRrwebAdds();
        if (cancelled) {
          return;
        }
        setEventCount(eventsRef.current.length);
        const { total } = syncProgress(replayer);

        if (!followingLiveRef.current) {
          setTotalMs(total);
          return;
        }

        const startTs = eventsRef.current[0]?.timestamp;
        if (startTs == null || firstNew.timestamp == null) {
          return;
        }
        const playFrom = livePlayFromMs(startTs, firstNew.timestamp);
        playingRef.current = true;
        setPlaying(true);
        setBuffering(false);
        setFollowingLive(true);
        replayer.play(playFrom);
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    return () => {
      cancelled = true;
    };
  }, [active, http, sessionId, startPlayer, syncProgress]);

  useEffect(() => {
    if (!active) {
      return;
    }
    void tickRef.current();
    const id = window.setInterval(() => {
      void tickRef.current();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [active, pollMs, sessionId]);

  useEffect(() => {
    if (!playing) {
      return;
    }
    const id = window.setInterval(() => {
      const replayer = replayerRef.current;
      if (!replayer) {
        return;
      }
      syncProgress(replayer);
    }, 100);
    return () => window.clearInterval(id);
  }, [playing, syncProgress]);

  useEffect(() => {
    return () => {
      destroyPlayer();
    };
  }, [destroyPlayer]);

  const openRecording = useCallback(() => {
    pushRumPath(history, `/session-replay/${encodeURIComponent(sessionId)}/replay`);
  }, [history, sessionId]);

  const onTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const node = timelineRef.current;
    if (!node || totalMs <= 0) {
      return;
    }
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    const pct = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    seekTo(Math.round((pct / 100) * totalMs), playingRef.current);
  };

  const seekBack = () => {
    seekTo(currentMs - LIVE_SEEK_BACK_MS, true);
  };

  const jumpToLive = () => {
    seekTo(totalMs, false);
  };

  const togglePlay = () => {
    const replayer = replayerRef.current;
    if (!replayer) {
      return;
    }
    if (playingRef.current) {
      replayer.pause();
      playingRef.current = false;
      followingLiveRef.current = false;
      setPlaying(false);
      setFollowingLive(false);
      setBuffering(false);
      syncProgress(replayer);
      return;
    }
    if (isAtLiveEdge(currentMs, totalMs)) {
      seekTo(0, true);
      return;
    }
    seekTo(currentMs, true);
  };

  const progressPct = totalMs > 0 ? Math.min(100, (currentMs / totalMs) * 100) : 0;
  const controlsReady = status === 'ready' && !error;
  const showBuffering = status === 'ready' && buffering && followingLive && !playing;

  const statusBadge = (() => {
    if (status === 'error') {
      return (
        <EuiBadge color="danger" data-test-subj="uxLiveSessionStatus">
          {i18n.translate('xpack.ux.sessions.live.errorBadge', {
            defaultMessage: 'Error',
          })}
        </EuiBadge>
      );
    }
    if (status === 'waiting') {
      return (
        <EuiBadge color="warning" data-test-subj="uxLiveSessionStatus">
          {i18n.translate('xpack.ux.sessions.live.waitingBadge', {
            defaultMessage: 'Waiting for snapshot',
          })}
        </EuiBadge>
      );
    }
    if (showBuffering) {
      return (
        <EuiBadge color="warning" data-test-subj="uxLiveSessionStatus">
          {i18n.translate('xpack.ux.sessions.live.bufferingBadge', {
            defaultMessage: 'Buffering',
          })}
        </EuiBadge>
      );
    }
    if (followingLive) {
      return (
        <EuiBadge color="success" data-test-subj="uxLiveSessionStatus">
          {i18n.translate('xpack.ux.sessions.live.followingBadge', {
            defaultMessage: 'Following',
          })}
        </EuiBadge>
      );
    }
    return (
      <EuiBadge color="hollow" data-test-subj="uxLiveSessionStatus">
        {i18n.translate('xpack.ux.sessions.live.reviewingBadge', {
          defaultMessage: 'Reviewing',
        })}
      </EuiBadge>
    );
  })();

  return (
    <div data-test-subj="uxLiveSessionPlayer">
      <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
        <EuiFlexItem grow={false}>{statusBadge}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.ux.sessions.live.eventCountDescription"
              defaultMessage="{count, plural, one {# event} other {# events}}"
              values={{ count: eventCount }}
            />
          </EuiText>
        </EuiFlexItem>
        {pageUrl && (
          <EuiFlexItem grow={false}>
            <EuiText size="s" className="eui-textTruncate" style={{ maxWidth: 280 }}>
              {pageUrl}
            </EuiText>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow />
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="uxLiveSessionPlayerOpenRecordingButton"
            size="s"
            iconType="play"
            onClick={openRecording}
          >
            {i18n.translate('xpack.ux.sessions.live.openRecordingButtonLabel', {
              defaultMessage: 'Open recording',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {error && (
        <EuiText size="s" color="danger">
          <p>{error}</p>
        </EuiText>
      )}
      {status === 'waiting' && !error && (
        <EuiEmptyPrompt
          paddingSize="s"
          icon={<EuiLoadingSpinner size="m" />}
          title={
            <h3>
              {i18n.translate('xpack.ux.sessions.live.waitingTitle', {
                defaultMessage: 'Waiting for Meta and FullSnapshot',
              })}
            </h3>
          }
          body={
            <p>
              {i18n.translate('xpack.ux.sessions.live.waitingDescription', {
                defaultMessage:
                  'Live follow starts after the first complete snapshot lands in Elasticsearch.',
              })}
            </p>
          }
        />
      )}
      <div css={styles.stageWrap}>
        <div ref={containerRef} css={styles.mount} data-test-subj="uxLiveSessionMount" />
        {showBuffering && (
          <div css={styles.bufferingOverlay} data-test-subj="uxLiveSessionBuffering">
            <EuiLoadingSpinner size="l" />
            <EuiText
              size="s"
              css={css`
                color: #fff;
              `}
            >
              <p>
                {i18n.translate('xpack.ux.sessions.live.bufferingTitle', {
                  defaultMessage: 'Buffering',
                })}
              </p>
            </EuiText>
          </div>
        )}
      </div>
      {controlsReady && (
        <div css={styles.controls}>
          <div
            ref={timelineRef}
            css={styles.timeline}
            onClick={onTimelineClick}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                seekTo(currentMs - LIVE_SEEK_BACK_MS, playingRef.current || buffering);
              } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                seekTo(currentMs + LIVE_SEEK_BACK_MS, playingRef.current);
              } else if (event.key === 'Home') {
                event.preventDefault();
                seekTo(0, playingRef.current);
              } else if (event.key === 'End') {
                event.preventDefault();
                seekTo(totalMs, false);
              }
            }}
            tabIndex={0}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPct)}
            aria-label={i18n.translate('xpack.ux.sessions.live.timelineAriaLabel', {
              defaultMessage: 'Live follow progress',
            })}
            data-test-subj="uxLiveSessionTimeline"
          >
            <div css={styles.played} style={{ width: `${progressPct}%` }} />
            <div css={styles.cursor} style={{ left: `${progressPct}%` }} />
          </div>
          <div css={styles.metaRow}>
            <EuiToolTip
              content={
                playing
                  ? i18n.translate('xpack.ux.sessions.live.pauseTooltip', {
                      defaultMessage: 'Pause',
                    })
                  : i18n.translate('xpack.ux.sessions.live.playTooltip', {
                      defaultMessage: 'Play',
                    })
              }
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                display="fill"
                size="m"
                iconType={playing ? 'pause' : 'play'}
                onClick={togglePlay}
                aria-label={
                  playing
                    ? i18n.translate('xpack.ux.sessions.live.pauseAriaLabel', {
                        defaultMessage: 'Pause',
                      })
                    : i18n.translate('xpack.ux.sessions.live.playAriaLabel', {
                        defaultMessage: 'Play',
                      })
                }
                data-test-subj="uxLiveSessionPlayPause"
              />
            </EuiToolTip>
            <EuiButtonEmpty
              size="s"
              onClick={seekBack}
              isDisabled={totalMs <= 0}
              aria-label={i18n.translate('xpack.ux.sessions.live.seekBackAriaLabel', {
                defaultMessage: 'Back 10 seconds',
              })}
              data-test-subj="uxLiveSessionSeekBack"
            >
              {i18n.translate('xpack.ux.sessions.live.seekBackButtonLabel', {
                defaultMessage: 'Back 10s',
              })}
            </EuiButtonEmpty>
            <EuiButtonEmpty
              size="s"
              onClick={jumpToLive}
              isDisabled={followingLive && buffering}
              aria-label={i18n.translate('xpack.ux.sessions.live.jumpToLiveAriaLabel', {
                defaultMessage: 'Jump to live',
              })}
              data-test-subj="uxLiveSessionJumpToLive"
            >
              {i18n.translate('xpack.ux.sessions.live.jumpToLiveButtonLabel', {
                defaultMessage: 'Live',
              })}
            </EuiButtonEmpty>
            <EuiText size="s" css={styles.clock} data-test-subj="uxLiveSessionClock">
              {formatReplayClock(currentMs)}
              <span style={{ opacity: 0.55 }}> / {formatReplayClock(totalMs)}</span>
            </EuiText>
            <div css={styles.metaSpacer} />
          </div>
        </div>
      )}
    </div>
  );
}
