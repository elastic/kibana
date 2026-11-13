/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import moment from 'moment-timezone';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import type { SessionListResponse, SessionLocationCluster } from '../../../../common/sessions';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../../ebt_constants';
import { ANONYMOUS_USER } from '../../../labels';
import { journeyOf, shortSessionId } from '../../../utils/describe_session';
import { formatSessionDuration } from '../../../utils/format_session_duration';
import { clusterTitle } from '../utils/sessions_map';

/** The latest sessions a cluster lists before the list takes over. */
export const CLUSTER_SESSIONS_SHOWN = 5;

const CLOSE_LABEL = i18n.translate('xpack.digitalExperience.sessionsMap.tooltip.close', {
  defaultMessage: 'Close',
});

/**
 * A cluster of the sessions map: where its sessions are from and, once the user clicks it, its
 * latest sessions to open, and the way to all of them in the list.
 */
export function SessionClusterTooltip({
  cluster,
  isLocked,
  sessions,
  loading,
  failed,
  sessionHref,
  selectedSessionId,
  timeZone,
  formatNumber,
  onShowAll,
  onClose,
}: {
  cluster: SessionLocationCluster;
  /** Clicked, rather than hovered: the sessions are only loaded then. */
  isLocked: boolean;
  sessions: SessionListResponse['sessions'] | undefined;
  loading: boolean;
  failed: boolean;
  sessionHref: (sessionId: string) => string;
  selectedSessionId: string;
  timeZone: string;
  formatNumber: (value: number) => string;
  onShowAll: () => void;
  onClose: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const countLabel = i18n.translate('xpack.digitalExperience.sessionsMap.tooltip.count', {
    defaultMessage: '{count, plural, one {# session} other {# sessions}}',
    values: { count: cluster.count },
  });

  return (
    <div
      data-test-subj="digitalExperienceSessionsMapCluster"
      css={css({ minWidth: 240, maxWidth: 320 })}
    >
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem css={css({ minWidth: 0 })}>
          <EuiTitle size="xxs">
            <h3
              className="eui-textTruncate"
              data-test-subj="digitalExperienceSessionsMapClusterTitle"
            >
              {clusterTitle(cluster)}
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {countLabel}
          </EuiText>
        </EuiFlexItem>
        {isLocked && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={CLOSE_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                {...getEbtProps({
                  action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CLOSE_DETAILS,
                  element: SESSIONS_EBT_ELEMENTS.MAP_CLUSTER_CLOSE,
                })}
                iconType="cross"
                size="xs"
                color="text"
                aria-label={CLOSE_LABEL}
                onClick={onClose}
                data-test-subj="digitalExperienceSessionsMapClusterClose"
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {!isLocked ? (
        <EuiText size="xs" color="subdued" css={css({ marginTop: euiTheme.size.xs })}>
          {i18n.translate('xpack.digitalExperience.sessionsMap.tooltip.clickHint', {
            defaultMessage: 'Click to see its sessions.',
          })}
        </EuiText>
      ) : (
        <>
          <EuiSpacer size="s" />
          {failed ? (
            <EuiText size="xs" color="danger">
              {i18n.translate('xpack.digitalExperience.sessionsMap.tooltip.loadError', {
                defaultMessage: 'Could not load the sessions.',
              })}
            </EuiText>
          ) : !sessions ? (
            loading && <EuiLoadingSpinner size="m" />
          ) : (
            <ul css={css({ borderTop: euiTheme.border.thin })}>
              {sessions.map((session) => {
                const journey = journeyOf(session);
                return (
                  <li key={session.sessionId} css={css({ borderBottom: euiTheme.border.thin })}>
                    <EuiLink
                      href={sessionHref(session.sessionId)}
                      data-test-subj={`digitalExperienceSessionsMapSession-${session.sessionId}`}
                      {...getEbtProps({
                        action: DIGITAL_EXPERIENCE_EBT_ACTIONS.VIEW_SESSION,
                        element: SESSIONS_EBT_ELEMENTS.MAP_CLUSTER_SESSION,
                      })}
                      css={css({
                        display: 'block',
                        padding: `${euiTheme.size.xs} 0`,
                        fontWeight:
                          session.sessionId === selectedSessionId
                            ? euiTheme.font.weight.bold
                            : undefined,
                      })}
                    >
                      <span className="eui-textTruncate" css={css({ display: 'block' })}>
                        {session.user ?? journey ?? ANONYMOUS_USER}
                      </span>
                    </EuiLink>
                    <EuiText size="xs" color="subdued" css={css({ paddingBottom: 4 })}>
                      {[
                        moment(session.startTime).tz(timeZone).format('MMM D, HH:mm'),
                        formatSessionDuration(session.durationMs),
                        shortSessionId(session.sessionId),
                      ].join(' · ')}
                    </EuiText>
                  </li>
                );
              })}
            </ul>
          )}
          {cluster.count > CLUSTER_SESSIONS_SHOWN && (
            <EuiButtonEmpty
              size="xs"
              flush="left"
              iconType="listBullet"
              onClick={onShowAll}
              data-test-subj="digitalExperienceSessionsMapClusterShowAll"
              {...getEbtProps({
                action: DIGITAL_EXPERIENCE_EBT_ACTIONS.VIEW_ALL,
                element: SESSIONS_EBT_ELEMENTS.MAP_CLUSTER_SHOW_ALL,
              })}
              css={css({ marginTop: euiTheme.size.xs })}
            >
              {i18n.translate('xpack.digitalExperience.sessionsMap.tooltip.showAll', {
                defaultMessage: 'Show all {count} in the list',
                values: { count: formatNumber(cluster.count) },
              })}
            </EuiButtonEmpty>
          )}
        </>
      )}
    </div>
  );
}
