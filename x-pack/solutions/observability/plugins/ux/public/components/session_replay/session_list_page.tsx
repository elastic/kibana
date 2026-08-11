/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiBetaBadge,
  EuiEmptyPrompt,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import type { SessionReplaySessionSummary } from '../../../common/session_replay';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { fetchSessionReplaySessions } from '../../services/rest/session_replay_api';

const RANGE_OPTIONS = [
  { value: 'now-1h', text: 'Last 1 hour' },
  { value: 'now-6h', text: 'Last 6 hours' },
  { value: 'now-24h', text: 'Last 24 hours' },
  { value: 'now-7d', text: 'Last 7 days' },
];

const formatTime = (value: string | null): string => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatDuration = (start: string | null, end: string | null): string => {
  if (!start || !end) {
    return '—';
  }
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) {
    return '—';
  }
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem}s`;
};

export function SessionListPage() {
  const { http } = useKibanaServices();
  const history = useHistory();
  const [rangeFrom, setRangeFrom] = useState('now-24h');
  const [sessions, setSessions] = useState<SessionReplaySessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    },
  ]);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSessionReplaySessions({
        http,
        rangeFrom,
        rangeTo: 'now',
      });
      setSessions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [http, rangeFrom]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const columns: Array<EuiBasicTableColumn<SessionReplaySessionSummary>> = [
    {
      field: 'sessionId',
      name: i18n.translate('xpack.ux.sessionReplay.table.sessionId', {
        defaultMessage: 'Session ID',
      }),
      truncateText: true,
      render: (sessionId: string) => (
        <EuiText size="s">
          <code>{sessionId}</code>
        </EuiText>
      ),
    },
    {
      field: 'startTime',
      name: i18n.translate('xpack.ux.sessionReplay.table.start', {
        defaultMessage: 'Start',
      }),
      render: (startTime: string | null) => formatTime(startTime),
    },
    {
      field: 'endTime',
      name: i18n.translate('xpack.ux.sessionReplay.table.duration', {
        defaultMessage: 'Duration',
      }),
      render: (_: string | null, item) => formatDuration(item.startTime, item.endTime),
    },
    {
      field: 'eventCount',
      name: i18n.translate('xpack.ux.sessionReplay.table.events', {
        defaultMessage: 'Events',
      }),
    },
    {
      name: i18n.translate('xpack.ux.sessionReplay.table.actions', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: i18n.translate('xpack.ux.sessionReplay.table.play', {
            defaultMessage: 'Play',
          }),
          description: i18n.translate('xpack.ux.sessionReplay.table.playDescription', {
            defaultMessage: 'Open session replay player',
          }),
          icon: 'play',
          type: 'icon',
          onClick: (item) => {
            history.push(`/session-replay/${encodeURIComponent(item.sessionId)}`);
          },
        },
      ],
    },
  ];

  return (
    <div data-test-subj="uxSessionReplayListPage">
      <EuiPageHeader
        pageTitle={
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.ux.sessionReplay.title', {
                defaultMessage: 'Session Replay',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label={i18n.translate('xpack.ux.sessionReplay.experimentalBadge', {
                  defaultMessage: 'Technical preview',
                })}
                tooltipContent={i18n.translate('xpack.ux.sessionReplay.experimentalTooltip', {
                  defaultMessage:
                    'Session replay is an experimental POC and may change or be removed.',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        description={i18n.translate('xpack.ux.sessionReplay.description', {
          defaultMessage:
            'Replay browser sessions captured by EDOT Browser into logs-rum.replay-*.',
        })}
      />
      <EuiSpacer size="m" />
      <EuiPanel paddingSize="m">
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiSelect
              options={RANGE_OPTIONS}
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              aria-label={i18n.translate('xpack.ux.sessionReplay.rangeLabel', {
                defaultMessage: 'Time range',
              })}
              data-test-subj="uxSessionReplayRangeSelect"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="refresh"
              onClick={loadSessions}
              isLoading={loading}
              data-test-subj="uxSessionReplayRefresh"
            >
              {i18n.translate('xpack.ux.sessionReplay.refresh', {
                defaultMessage: 'Refresh',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {error ? (
          <EuiEmptyPrompt
            color="danger"
            iconType="error"
            title={
              <h2>
                {i18n.translate('xpack.ux.sessionReplay.loadErrorTitle', {
                  defaultMessage: 'Unable to load sessions',
                })}
              </h2>
            }
            body={<p>{error}</p>}
            actions={
              <EuiButtonEmpty data-test-subj="uxSessionListPageRetryButton" onClick={loadSessions}>
                {i18n.translate('xpack.ux.sessionReplay.retry', {
                  defaultMessage: 'Retry',
                })}
              </EuiButtonEmpty>
            }
          />
        ) : (
          <EuiBasicTable
            tableCaption={i18n.translate('xpack.ux.sessionReplay.tableCaption', {
              defaultMessage: 'Session replay sessions',
            })}
            items={sessions}
            columns={columns}
            loading={loading}
            noItemsMessage={i18n.translate('xpack.ux.sessionReplay.empty', {
              defaultMessage: 'No replay sessions found for this time range.',
            })}
            data-test-subj="uxSessionReplayTable"
          />
        )}
      </EuiPanel>
    </div>
  );
}
