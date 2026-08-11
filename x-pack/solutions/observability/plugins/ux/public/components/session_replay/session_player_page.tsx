/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiEmptyPrompt,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory, useParams } from 'react-router-dom';
import { css } from '@emotion/react';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { fetchSessionReplayEvents } from '../../services/rest/session_replay_api';

interface ReplayerInstance {
  play: (timeOffset?: number) => void;
  pause: () => void;
  setConfig: (config: { speed?: number }) => void;
  destroy?: () => void;
}

export function SessionPlayerPage() {
  const { euiTheme } = useEuiTheme();
  const playerFrameCss = css`
    width: 100%;
    min-height: 480px;
    background: ${euiTheme.colors.ink};
    border-radius: ${euiTheme.border.radius.medium};
    overflow: hidden;
    position: relative;

    .replayer-wrapper {
      width: 100% !important;
      height: 480px !important;
    }
  `;
  const { sessionId: rawSessionId } = useParams<{ sessionId: string }>();
  const sessionId = decodeURIComponent(rawSessionId);
  const { http } = useKibanaServices();
  const history = useHistory();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const replayerRef = useRef<ReplayerInstance | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState('1');
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.ux.sessionReplay.breadcrumbs.root', {
        defaultMessage: 'User Experience',
      }),
      href: http.basePath.prepend('/app/ux'),
    },
    {
      text: i18n.translate('xpack.ux.sessionReplay.breadcrumbs.list', {
        defaultMessage: 'Session Replay',
      }),
      href: http.basePath.prepend('/app/ux/session-replay'),
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        history.push('/session-replay');
      },
    },
    {
      text: sessionId.slice(0, 8),
    },
  ]);

  const destroyPlayer = useCallback(() => {
    if (replayerRef.current?.destroy) {
      try {
        replayerRef.current.destroy();
      } catch {
        // ignore
      }
    }
    replayerRef.current = null;
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      destroyPlayer();
      try {
        const response = await fetchSessionReplayEvents({ http, sessionId });
        if (cancelled) {
          return;
        }
        setEventCount(response.total);

        if (response.events.length === 0) {
          setError(
            i18n.translate('xpack.ux.sessionReplay.player.noEvents', {
              defaultMessage: 'No replay events found for this session.',
            })
          );
          return;
        }

        const [{ Replayer: ReplayerCtor }] = await Promise.all([
          import('rrweb'),
          import('rrweb/dist/style.css'),
        ]);
        if (cancelled || !containerRef.current) {
          return;
        }

        const replayer = new ReplayerCtor(response.events as never[], {
          root: containerRef.current,
          speed: Number(speedRef.current),
        }) as unknown as ReplayerInstance;
        replayerRef.current = replayer;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      destroyPlayer();
    };
  }, [http, sessionId, destroyPlayer]);

  useEffect(() => {
    replayerRef.current?.setConfig({ speed: Number(speed) });
  }, [speed]);

  const togglePlay = () => {
    const replayer = replayerRef.current;
    if (!replayer) {
      return;
    }
    if (playing) {
      replayer.pause();
      setPlaying(false);
    } else {
      replayer.play();
      setPlaying(true);
    }
  };

  const restart = () => {
    const replayer = replayerRef.current;
    if (!replayer) {
      return;
    }
    replayer.pause();
    replayer.play(0);
    setPlaying(true);
  };

  return (
    <div data-test-subj="uxSessionReplayPlayerPage">
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.ux.sessionReplay.player.title', {
          defaultMessage: 'Session replay',
        })}
        description={sessionId}
        rightSideItems={[
          <EuiButtonEmpty
            data-test-subj="uxSessionPlayerPageBackToSessionsButton"
            key="back"
            iconType="arrowLeft"
            onClick={() => history.push('/session-replay')}
          >
            {i18n.translate('xpack.ux.sessionReplay.player.back', {
              defaultMessage: 'Back to sessions',
            })}
          </EuiButtonEmpty>,
        ]}
      />
      <EuiSpacer size="m" />
      <EuiPanel paddingSize="m">
        <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType={playing ? 'pause' : 'play'}
              onClick={togglePlay}
              isDisabled={loading || Boolean(error)}
              fill
              data-test-subj="uxSessionReplayPlayPause"
            >
              {playing
                ? i18n.translate('xpack.ux.sessionReplay.player.pause', {
                    defaultMessage: 'Pause',
                  })
                : i18n.translate('xpack.ux.sessionReplay.player.play', {
                    defaultMessage: 'Play',
                  })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="refresh"
              onClick={restart}
              isDisabled={loading || Boolean(error)}
              data-test-subj="uxSessionReplayRestart"
            >
              {i18n.translate('xpack.ux.sessionReplay.player.restart', {
                defaultMessage: 'Restart',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={i18n.translate('xpack.ux.sessionReplay.player.speedLegend', {
                defaultMessage: 'Playback speed',
              })}
              options={[
                { id: '1', label: '1x' },
                { id: '2', label: '2x' },
                { id: '4', label: '4x' },
              ]}
              idSelected={speed}
              onChange={(id) => setSpeed(id)}
              buttonSize="compressed"
              isDisabled={loading || Boolean(error)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.ux.sessionReplay.player.eventCount', {
                defaultMessage: '{count} events',
                values: { count: eventCount },
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {loading && (
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {error && !loading && (
          <EuiEmptyPrompt
            color="danger"
            iconType="error"
            title={
              <h2>
                {i18n.translate('xpack.ux.sessionReplay.player.errorTitle', {
                  defaultMessage: 'Unable to load replay',
                })}
              </h2>
            }
            body={<p>{error}</p>}
          />
        )}
        <div
          ref={containerRef}
          css={playerFrameCss}
          hidden={loading || Boolean(error)}
          data-test-subj="uxSessionReplayPlayerFrame"
        />
      </EuiPanel>
    </div>
  );
}
