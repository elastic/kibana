/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiCard, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import type { RumReportSessionChip } from '../../../../common/rum_report';
import { pushRumPath } from '../../../utils/rum_search';
import { formatDurationMs } from '../../session_replay/session_ui';
import { formatReportDate } from './format';

export function SessionChips({ sessions }: { sessions: RumReportSessionChip[] }) {
  const history = useHistory();

  if (sessions.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.ux.reports.sessions.emptyLabel', {
          defaultMessage: 'No sample sessions in this period',
        })}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup wrap gutterSize="s">
      {sessions.map((session) => (
        <EuiFlexItem key={session.sessionId} grow={false} style={{ minWidth: 220, maxWidth: 280 }}>
          <EuiCard
            className="uxRumSessionChip"
            data-test-subj={`uxReportSessionChip-${session.sessionId}`}
            layout="horizontal"
            titleSize="xs"
            title={
              session.displayUser ??
              i18n.translate('xpack.ux.reports.sessions.anonymousLabel', {
                defaultMessage: 'Anonymous',
              })
            }
            description={
              <EuiFlexGroup direction="column" gutterSize="xs">
                <EuiFlexItem>
                  <EuiText size="xs" color="subdued">
                    {formatReportDate(session.startTime)} · {formatDurationMs(session.durationMs)}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                    {session.browser && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge>{session.browser}</EuiBadge>
                      </EuiFlexItem>
                    )}
                    {session.errorCount > 0 && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="danger">
                          {i18n.translate('xpack.ux.reports.sessions.errorsLabel', {
                            defaultMessage: '{count} errors',
                            values: { count: session.errorCount },
                          })}
                        </EuiBadge>
                      </EuiFlexItem>
                    )}
                    {session.rageClickCount > 0 && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="warning">
                          {i18n.translate('xpack.ux.reports.sessions.rageLabel', {
                            defaultMessage: '{count} rage',
                            values: { count: session.rageClickCount },
                          })}
                        </EuiBadge>
                      </EuiFlexItem>
                    )}
                    {session.hasReplay && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">
                          {i18n.translate('xpack.ux.reports.sessions.replayLabel', {
                            defaultMessage: 'Replay',
                          })}
                        </EuiBadge>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            onClick={() =>
              pushRumPath(
                history,
                session.hasReplay
                  ? `/session-replay/${encodeURIComponent(session.sessionId)}/replay`
                  : `/session-replay/${encodeURIComponent(session.sessionId)}`
              )
            }
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
