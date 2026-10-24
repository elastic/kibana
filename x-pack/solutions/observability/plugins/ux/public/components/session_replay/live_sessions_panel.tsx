/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { LiveReplaySession } from '../../../common/session_replay';
import {
  DEFAULT_LIVE_POLL_MS,
  filterLiveSessions,
  LIVE_LOOKBACK_SECONDS,
  LIVE_POLL_INTERVALS_MS,
  LIVE_SESSION_LIST_SIZE_MAX,
  parseFollowSessionId,
  parseLivePollMs,
  type LivePollIntervalMs,
} from '../../../common/session_replay_live';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { fetchLiveReplaySessions } from '../../services/rest/session_replay_api';
import { formatRelativeTime } from './session_ui';
import { LiveSessionPlayer } from './live_session_player';

const pollOptionLabel = (ms: LivePollIntervalMs): string =>
  i18n.translate('xpack.ux.sessions.live.pollIntervalDropDownOptionLabel', {
    defaultMessage: '{seconds}s',
    values: { seconds: ms / 1000 },
  });

const shortSessionId = (sessionId: string): string =>
  sessionId.length > 18 ? `${sessionId.slice(0, 18)}…` : sessionId;

export function LiveSessionsPanel() {
  const { euiTheme } = useEuiTheme();
  const { http } = useKibanaServices();

  const [open, setOpen] = useState(false);
  const [pollMs, setPollMs] = useState<LivePollIntervalMs>(DEFAULT_LIVE_POLL_MS);
  const [sessions, setSessions] = useState<LiveReplaySession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);

  const loadLive = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    setLoading(true);
    try {
      const result = await fetchLiveReplaySessions({
        http,
        lookbackSeconds: LIVE_LOOKBACK_SECONDS,
        size: LIVE_SESSION_LIST_SIZE_MAX,
      });
      setSessions(result.sessions);
      setError(null);
      setSelectedId((current) => current ?? result.sessions[0]?.sessionId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [http]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadLive();
    const id = window.setInterval(() => {
      void loadLive();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [loadLive, open, pollMs]);

  const visibleSessions = useMemo(() => filterLiveSessions(sessions, query), [sessions, query]);
  const followId = parseFollowSessionId(query);
  const canFollowUnknown =
    followId != null &&
    !sessions.some((session) => session.sessionId.toLowerCase() === followId.toLowerCase());

  const pollOptions = LIVE_POLL_INTERVALS_MS.map((ms) => ({
    id: `poll-${ms}`,
    label: pollOptionLabel(ms),
  }));

  const styles = useMemo(
    () => ({
      list: css`
        max-height: 360px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 2px;
      `,
      row: css`
        display: block;
        width: 100%;
        padding: ${euiTheme.size.xs} ${euiTheme.size.s};
        border: 0;
        border-radius: ${euiTheme.border.radius.small};
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;

        &:hover {
          background: ${euiTheme.colors.lightestShade};
        }
      `,
      rowSelected: css`
        background: ${euiTheme.colors.lightestShade};
        box-shadow: inset 3px 0 0 ${euiTheme.colors.primary};
      `,
      id: css`
        font-family: ${euiTheme.font.familyCode};
        font-size: 12px;
        font-weight: 600;
      `,
      meta: css`
        color: ${euiTheme.colors.textSubdued};
        font-size: 12px;
      `,
    }),
    [euiTheme]
  );

  const renderRow = (session: LiveReplaySession) => {
    const selected = session.sessionId === selectedId;
    return (
      <button
        key={session.sessionId}
        type="button"
        css={[styles.row, selected && styles.rowSelected]}
        onClick={() => setSelectedId(session.sessionId)}
        aria-pressed={selected}
        title={session.sessionId}
        data-test-subj={`uxLiveSessionRow-${session.sessionId}`}
      >
        <div css={styles.id}>{shortSessionId(session.sessionId)}</div>
        <div css={styles.meta}>
          {session.serviceName ? `${session.serviceName} · ` : ''}
          {formatRelativeTime(session.lastSeen)}
          {' · '}
          {i18n.translate('xpack.ux.sessions.live.rowEventCountDescription', {
            defaultMessage: '{count} events',
            values: { count: session.eventCount },
          })}
        </div>
      </button>
    );
  };

  return (
    <EuiPanel paddingSize="m" data-test-subj="uxLiveSessionsPanel">
      <EuiAccordion
        id="uxLiveSessionsAccordion"
        initialIsOpen={false}
        onToggle={setOpen}
        buttonContent={
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h2>
                  {i18n.translate('xpack.ux.sessions.live.accordionTitle', {
                    defaultMessage: 'Live follow',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            {open && (
              <EuiFlexItem grow={false}>
                <EuiBadge color={sessions.length > 0 ? 'success' : 'hollow'}>
                  {i18n.translate('xpack.ux.sessions.live.sessionCountBadge', {
                    defaultMessage: '{count} live',
                    values: { count: sessions.length },
                  })}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        }
      >
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.ux.sessions.live.introDescription', {
              defaultMessage:
                'Near-live follow by polling Elasticsearch. Typical lag is several seconds (SDK flush + refresh + poll), not a live wire.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFormRow
          label={i18n.translate('xpack.ux.sessions.live.pollIntervalLabel', {
            defaultMessage: 'Poll interval',
          })}
        >
          <EuiButtonGroup
            legend={i18n.translate('xpack.ux.sessions.live.pollIntervalAriaLabel', {
              defaultMessage: 'Live follow poll interval',
            })}
            type="single"
            idSelected={`poll-${pollMs}`}
            options={pollOptions}
            onChange={(id) => setPollMs(parseLivePollMs(Number(id.replace('poll-', ''))))}
            buttonSize="compressed"
            data-test-subj="uxLivePollInterval"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        {error && (
          <>
            <EuiText size="s" color="danger">
              <p>{error}</p>
            </EuiText>
            <EuiButtonEmpty
              data-test-subj="uxLiveSessionsPanelRetryButton"
              size="s"
              onClick={() => void loadLive()}
            >
              {i18n.translate('xpack.ux.sessions.live.retryButtonLabel', {
                defaultMessage: 'Retry',
              })}
            </EuiButtonEmpty>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiFlexGroup gutterSize="l" alignItems="stretch">
          <EuiFlexItem grow={false} style={{ width: 320 }}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ux.sessions.live.listHeadingDescription"
                defaultMessage="Replay events in the last {seconds}s"
                values={{ seconds: LIVE_LOOKBACK_SECONDS }}
              />
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFieldSearch
              compressed
              incremental
              isClearable
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={i18n.translate('xpack.ux.sessions.live.searchPlaceholder', {
                defaultMessage: 'Search session id or service',
              })}
              aria-label={i18n.translate('xpack.ux.sessions.live.searchAriaLabel', {
                defaultMessage: 'Search live sessions',
              })}
              data-test-subj="uxLiveSessionSearch"
            />
            <EuiSpacer size="s" />
            {canFollowUnknown && followId && (
              <>
                <EuiButtonEmpty
                  size="s"
                  flush="left"
                  onClick={() => setSelectedId(followId)}
                  data-test-subj="uxLiveSessionFollowId"
                >
                  {i18n.translate('xpack.ux.sessions.live.followIdButtonLabel', {
                    defaultMessage: 'Follow {sessionId}',
                    values: { sessionId: shortSessionId(followId) },
                  })}
                </EuiButtonEmpty>
                <EuiSpacer size="s" />
              </>
            )}
            {sessions.length === 0 && !loading ? (
              <EuiText size="s" color="subdued">
                <p>
                  {i18n.translate('xpack.ux.sessions.live.emptyDescription', {
                    defaultMessage: 'No sessions are writing replay events right now.',
                  })}
                </p>
              </EuiText>
            ) : visibleSessions.length === 0 ? (
              <EuiText size="s" color="subdued">
                <p>
                  {i18n.translate('xpack.ux.sessions.live.searchEmptyDescription', {
                    defaultMessage: 'No live sessions match this search.',
                  })}
                </p>
              </EuiText>
            ) : (
              <div css={styles.list} data-test-subj="uxLiveSessionList">
                {visibleSessions.map(renderRow)}
              </div>
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            {selectedId ? (
              <LiveSessionPlayer
                key={selectedId}
                http={http}
                sessionId={selectedId}
                pollMs={pollMs}
                active={open}
              />
            ) : (
              <EuiText size="s" color="subdued">
                <p>
                  {i18n.translate('xpack.ux.sessions.live.selectDescription', {
                    defaultMessage: 'Select a live session to follow.',
                  })}
                </p>
              </EuiText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
    </EuiPanel>
  );
}
