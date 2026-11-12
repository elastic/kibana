/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { css } from '@emotion/react';
import moment from 'moment-timezone';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  euiPaletteColorBlind,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { useAbortableAsync } from '@kbn/react-hooks';
import type { SessionSummary } from '../../../../common/sessions';
import type { ApplicationSource } from '../../../../common/types/applications';
import { LoadErrorPrompt } from '../../../components/load_error_prompt';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../../ebt_constants';
import { useApiClient } from '../../../hooks/use_api_client';
import { useApplicationLinks } from '../../../hooks/use_application_links';
import { useDigitalExperienceParams } from '../../../hooks/use_digital_experience_params';
import { useEnvironment } from '../../../hooks/use_environment';
import { useEqualValue } from '../../../hooks/use_equal_value';
import { useFormatters } from '../../../hooks/use_formatters';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useUpdateUrlQuery } from '../../../hooks/use_update_url_query';
import { ANONYMOUS_USER } from '../../../labels';
import { clientOf, locationOf } from '../../../utils/describe_session';
import { formatSessionDuration } from '../../../utils/format_session_duration';
import { pickSessionsListQuery } from '../../../utils/sessions_list_query';
import { sessionsListRequestQuery } from '../../sessions/hooks/sessions_list_request';
import {
  hasSessionsListFilters,
  sessionsListStateOf,
} from '../../sessions/hooks/use_sessions_list_query';

const PALETTE = euiPaletteColorBlind();

const TITLE = i18n.translate('xpack.digitalExperience.sessionDetail.rail.title', {
  defaultMessage: 'Sessions',
});

const HIDE_LABEL = i18n.translate('xpack.digitalExperience.sessionDetail.rail.hide', {
  defaultMessage: 'Hide the sessions list',
});

const PREVIOUS_PAGE_LABEL = i18n.translate(
  'xpack.digitalExperience.sessionDetail.rail.previousPage',
  { defaultMessage: 'Previous page of sessions' }
);

const NEXT_PAGE_LABEL = i18n.translate('xpack.digitalExperience.sessionDetail.rail.nextPage', {
  defaultMessage: 'Next page of sessions',
});

const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.digitalExperience.sessionDetail.rail.searchPlaceholder',
  { defaultMessage: 'User, page or error' }
);

/** The pages a session went through, as a bar of equal parts colored by page. */
function JourneyBar({ journey }: { journey: string[] }) {
  const { euiTheme } = useEuiTheme();
  const colors = new Map<string, string>();
  for (const page of journey) {
    if (!colors.has(page)) {
      colors.set(page, PALETTE[colors.size % PALETTE.length]);
    }
  }
  return (
    <div
      aria-hidden={true}
      css={css({ display: 'flex', gap: 2, height: euiTheme.size.xs, marginTop: euiTheme.size.xs })}
    >
      {journey.map((page, index) => (
        <span
          key={index}
          css={css({ flex: 1, borderRadius: euiTheme.border.radius.small })}
          style={{ background: colors.get(page) }}
        />
      ))}
    </div>
  );
}

function RailItem({
  session,
  href,
  selected,
  timeZone,
}: {
  session: SessionSummary;
  href: string;
  selected: boolean;
  timeZone: string;
}) {
  const { euiTheme } = useEuiTheme();
  const ref = useRef<HTMLAnchorElement>(null);
  // Keeps the session in view when the list loads or the user steps to another one.
  useEffect(() => {
    if (selected) {
      ref.current?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [selected]);

  const details = [
    moment(session.startTime).tz(timeZone).format('MMM D, HH:mm'),
    clientOf(session),
    locationOf(session),
  ].filter(Boolean);

  return (
    <a
      ref={ref}
      href={href}
      aria-current={selected ? 'page' : undefined}
      data-test-subj={`digitalExperienceSessionsRailItem-${session.sessionId}`}
      {...getEbtProps({
        action: DIGITAL_EXPERIENCE_EBT_ACTIONS.VIEW_SESSION,
        element: SESSIONS_EBT_ELEMENTS.RAIL_SESSION,
      })}
      css={css({
        display: 'block',
        padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
        borderBottom: euiTheme.border.thin,
        borderLeft: `${euiTheme.size.xs} solid ${
          selected ? euiTheme.colors.primary : 'transparent'
        }`,
        background: selected ? euiTheme.colors.backgroundBasePrimary : undefined,
        color: euiTheme.colors.textParagraph,
        '&:hover, &:focus-visible': {
          background: selected
            ? euiTheme.colors.backgroundBasePrimary
            : euiTheme.colors.backgroundBaseSubdued,
          textDecoration: 'none',
        },
      })}
    >
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="baseline">
        <EuiFlexItem css={css({ minWidth: 0 })}>
          <EuiText size="s" className="eui-textTruncate">
            <strong>{session.user ?? ANONYMOUS_USER}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {formatSessionDuration(session.durationMs)}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued" className="eui-textTruncate">
        {details.join(' · ')}
      </EuiText>
      {session.journey.length > 0 && <JourneyBar journey={session.journey} />}
      {(session.jsErrorCount > 0 || session.failedRequestCount > 0 || session.bounced) && (
        <EuiFlexGroup gutterSize="xs" responsive={false} wrap css={css({ marginTop: 4 })}>
          {session.jsErrorCount > 0 && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="danger">
                {i18n.translate('xpack.digitalExperience.sessionDetail.rail.errors', {
                  defaultMessage: '{count, plural, one {# error} other {# errors}}',
                  values: { count: session.jsErrorCount },
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
          {session.failedRequestCount > 0 && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">
                {i18n.translate('xpack.digitalExperience.sessionDetail.rail.failedRequests', {
                  defaultMessage: '{count} failed',
                  values: { count: session.failedRequestCount },
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
          {session.bounced && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate('xpack.digitalExperience.sessionDetail.rail.bounced', {
                  defaultMessage: 'Bounced',
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
    </a>
  );
}

/**
 * The sessions list beside a session, with the list's search, filters, sort and page from the URL,
 * so the user can step from session to session without going back to the list.
 */
export function SessionsRail({
  serviceName,
  sessionId,
  source,
  onHide,
  headerHeight,
}: {
  serviceName: string;
  sessionId: string;
  source: ApplicationSource;
  onHide: () => void;
  /** The height of the session's page header, which the list's header matches. */
  headerHeight?: number;
}) {
  const { euiTheme } = useEuiTheme();
  const apiClient = useApiClient();
  const { timeZone, formatNumber } = useFormatters();
  const { timeRange } = useTimeRange();
  const { environment } = useEnvironment();
  const updateUrlQuery = useUpdateUrlQuery();
  const { query } = useDigitalExperienceParams('/{serviceName}/sessions/{sessionId}');
  // The route gives a new query object on each navigation; moving to another session must not
  // load the list again.
  const sessionsQuery = useEqualValue(pickSessionsListQuery(query));
  const state = useMemo(() => sessionsListStateOf(sessionsQuery), [sessionsQuery]);
  const { sessionHref, sessionsHref } = useApplicationLinks(serviceName, source);

  const {
    value: response,
    loading,
    error,
    refresh,
  } = useAbortableAsync(
    ({ signal }) =>
      apiClient.fetch('GET /internal/digital_experience/applications/{serviceName}/sessions', {
        signal,
        params: {
          path: { serviceName },
          query: sessionsListRequestQuery({ timeRange, environment, state }),
        },
      }),
    [apiClient, serviceName, timeRange, environment, state],
    { unsetValueOnError: true }
  );

  const total = response?.total ?? 0;
  const firstShown = state.page * state.perPage + 1;
  const lastShown = Math.min(total, (state.page + 1) * state.perPage);
  const setPage = (page: number) =>
    updateUrlQuery({ page: page > 0 ? String(page) : undefined }, { replace: true });

  return (
    <div
      data-test-subj="digitalExperienceSessionsRail"
      css={css({ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 })}
    >
      {/* As tall as the session's header, so that their bottom borders line up. */}
      <div
        css={css({
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: headerHeight,
          padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
          borderBottom: euiTheme.border.thin,
        })}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h2>{TITLE}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {response && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" data-test-subj="digitalExperienceSessionsRailTotal">
                {formatNumber(total)}
              </EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiToolTip content={HIDE_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="transitionLeftOut"
                aria-label={HIDE_LABEL}
                onClick={onHide}
                data-test-subj="digitalExperienceSessionsRailHide"
                {...getEbtProps({
                  action: DIGITAL_EXPERIENCE_EBT_ACTIONS.TOGGLE_SESSIONS_LIST,
                  element: SESSIONS_EBT_ELEMENTS.RAIL_HIDE,
                })}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        {/* Spaced by a spacer, not a margin on the field: its icon is placed against its wrapper. */}
        <EuiSpacer size="s" />
        <EuiFieldSearch
          compressed
          fullWidth
          defaultValue={state.search ?? ''}
          placeholder={SEARCH_PLACEHOLDER}
          aria-label={SEARCH_PLACEHOLDER}
          // On Enter, not on each key: each search is a request.
          onSearch={(value) =>
            updateUrlQuery(
              { search: value.trim() || undefined },
              { replace: true, remove: ['page'] }
            )
          }
          data-test-subj="digitalExperienceSessionsRailSearch"
        />
      </div>

      {hasSessionsListFilters({ ...state, search: undefined }) && (
        <EuiText
          size="xs"
          color="subdued"
          css={css({
            padding: `${euiTheme.size.xs} ${euiTheme.size.m}`,
            borderBottom: euiTheme.border.thin,
          })}
        >
          {i18n.translate('xpack.digitalExperience.sessionDetail.rail.filtered', {
            defaultMessage: 'Filtered like the sessions list.',
          })}{' '}
          <EuiLink
            href={sessionsHref(sessionsQuery)}
            data-test-subj="digitalExperienceSessionsRailEditFilters"
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.BACK_TO_SESSIONS,
              element: SESSIONS_EBT_ELEMENTS.RAIL_EDIT_FILTERS,
            })}
          >
            {i18n.translate('xpack.digitalExperience.sessionDetail.rail.editFilters', {
              defaultMessage: 'Edit filters',
            })}
          </EuiLink>
        </EuiText>
      )}

      {/* A new search or page keeps the current sessions until the next ones arrive. */}
      <div css={css({ position: 'relative', height: 2 })}>
        {loading && response && (
          <EuiProgress
            size="xs"
            color="accent"
            data-test-subj="digitalExperienceSessionsRailLoading"
          />
        )}
      </div>
      <div
        css={css({ flex: 1, minHeight: 0, overflowY: 'auto' })}
        role="navigation"
        aria-label={TITLE}
      >
        {error ? (
          <LoadErrorPrompt
            data-test-subj="digitalExperienceSessionsRailError"
            retryDataTestSubj="digitalExperienceSessionsRailRetry"
            retryEbtElement={SESSIONS_EBT_ELEMENTS.RETRY}
            title={i18n.translate('xpack.digitalExperience.sessionDetail.rail.loadError', {
              defaultMessage: 'Could not load the sessions',
            })}
            error={error}
            onRetry={refresh}
          />
        ) : !response ? (
          <EuiFlexGroup justifyContent="center" css={css({ padding: euiTheme.size.l })}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexGroup>
        ) : response.sessions.length === 0 ? (
          <EuiText size="s" color="subdued" css={css({ padding: euiTheme.size.m })}>
            {i18n.translate('xpack.digitalExperience.sessionDetail.rail.empty', {
              defaultMessage: 'No sessions match.',
            })}
          </EuiText>
        ) : (
          response.sessions.map((session) => (
            <RailItem
              key={session.sessionId}
              session={session}
              href={sessionHref(session.sessionId, sessionsQuery)}
              selected={session.sessionId === sessionId}
              timeZone={timeZone}
            />
          ))
        )}
      </div>

      {total > state.perPage && (
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          responsive={false}
          css={css({
            // A flex group grows by default, which would take the list's height.
            flexGrow: 0,
            padding: `${euiTheme.size.xs} ${euiTheme.size.m}`,
            borderTop: euiTheme.border.thin,
          })}
        >
          <EuiFlexItem>
            <EuiText size="xs" color="subdued" data-test-subj="digitalExperienceSessionsRailRange">
              {i18n.translate('xpack.digitalExperience.sessionDetail.rail.range', {
                defaultMessage: '{first}–{last} of {total}',
                values: {
                  first: formatNumber(firstShown),
                  last: formatNumber(lastShown),
                  total: formatNumber(total),
                },
              })}
            </EuiText>
          </EuiFlexItem>
          {(
            [
              {
                id: 'previous',
                iconType: 'chevronSingleLeft',
                label: PREVIOUS_PAGE_LABEL,
                disabled: state.page === 0,
                page: state.page - 1,
              },
              {
                id: 'next',
                iconType: 'chevronSingleRight',
                label: NEXT_PAGE_LABEL,
                disabled: lastShown >= total,
                page: state.page + 1,
              },
            ] as const
          ).map(({ id, iconType, label, disabled, page }) => (
            <EuiFlexItem grow={false} key={id}>
              <EuiToolTip content={label} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType={iconType}
                  aria-label={label}
                  isDisabled={disabled}
                  onClick={() => setPage(page)}
                  data-test-subj={`digitalExperienceSessionsRail-${id}Page`}
                  {...getEbtProps({
                    action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CHANGE_PAGE,
                    element: SESSIONS_EBT_ELEMENTS.RAIL_PAGE,
                  })}
                />
              </EuiToolTip>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </div>
  );
}
