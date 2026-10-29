/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiLink,
  EuiText,
  EuiTextColor,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import type { SessionSortField, SessionSummary } from '../../../../common/sessions';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../../ebt_constants';
import type { Formatters } from '../../../hooks/use_formatters';
import { formatSessionDuration } from '../../../utils/format_session_duration';
import { SESSIONS_PAGE_SIZES, type SessionsListState } from '../hooks/use_sessions_list_query';
import { JourneyTrail } from './journey_trail';

/** Elasticsearch `index.max_result_window` default: the list pages no further. */
export const MAX_LISTED_SESSIONS = 10_000;

/** The list API's sort field of each sortable column. */
const SORT_FIELDS = {
  startTime: 'start_time',
  durationMs: 'duration_ms',
  pageViewCount: 'page_view_count',
  clickCount: 'click_count',
  errorCount: 'error_count',
} as const satisfies Partial<Record<keyof SessionSummary, SessionSortField>>;

type SortableColumn = keyof typeof SORT_FIELDS;

const columnOfSortField = (field: SessionSortField): SortableColumn =>
  (Object.keys(SORT_FIELDS) as SortableColumn[]).find((column) => SORT_FIELDS[column] === field) ??
  'startTime';

export const ANONYMOUS_USER = i18n.translate(
  'xpack.digitalExperience.sessions.table.anonymousUserLabel',
  { defaultMessage: 'Anonymous' }
);

/** Browser, OS and device, as far as they're known, e.g. "Chrome 130 · macOS". */
export const clientOf = ({ userAgent }: Pick<SessionSummary, 'userAgent'>): string =>
  [
    [userAgent.browser, userAgent.browserVersion].filter(Boolean).join(' '),
    userAgent.os,
    userAgent.device,
  ]
    .filter(Boolean)
    .join(' · ');

export function SessionsTable({
  sessions,
  total,
  state,
  isLoading,
  noItemsMessage,
  formatters: { formatDate, formatNumber },
  sessionHref,
  onChange,
}: {
  sessions: SessionSummary[];
  total: number;
  state: SessionsListState;
  isLoading: boolean;
  noItemsMessage: ReactNode;
  formatters: Formatters;
  sessionHref: (sessionId: string) => string;
  onChange: (patch: {
    sortField?: string;
    sortDirection?: string;
    page?: string;
    perPage?: string;
  }) => void;
}) {
  const columns = useMemo<Array<EuiBasicTableColumn<SessionSummary>>>(
    () => [
      {
        field: 'startTime',
        name: i18n.translate('xpack.digitalExperience.sessions.table.startTimeColumn', {
          defaultMessage: 'Start time',
        }),
        sortable: true,
        // Wide enough for the default date format, milliseconds included, on one line.
        width: '18em',
        minWidth: '18em',
        className: 'eui-textNoWrap',
        render: (startTime: string, { sessionId }: SessionSummary) => (
          <EuiLink
            data-test-subj="digitalExperienceSessionLink"
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.VIEW_SESSION,
              element: SESSIONS_EBT_ELEMENTS.SESSION_LINK,
            })}
            href={sessionHref(sessionId)}
          >
            {formatDate(startTime)}
          </EuiLink>
        ),
      },
      {
        field: 'user',
        name: i18n.translate('xpack.digitalExperience.sessions.table.userColumn', {
          defaultMessage: 'User',
        }),
        width: '16em',
        render: (user: string | null, session: SessionSummary) => {
          const client = clientOf(session);
          return (
            <div css={{ minWidth: 0 }}>
              <EuiText size="s" className="eui-textTruncate" title={user ?? undefined}>
                {user ?? <EuiTextColor color="subdued">{ANONYMOUS_USER}</EuiTextColor>}
              </EuiText>
              {client && (
                <EuiText size="xs" color="subdued" className="eui-textTruncate" title={client}>
                  {client}
                </EuiText>
              )}
            </div>
          );
        },
      },
      {
        field: 'journey',
        name: i18n.translate('xpack.digitalExperience.sessions.table.journeyColumn', {
          defaultMessage: 'Journey',
        }),
        render: (journey: string[]) => <JourneyTrail journey={journey} />,
      },
      {
        field: 'durationMs',
        name: i18n.translate('xpack.digitalExperience.sessions.table.durationColumn', {
          defaultMessage: 'Duration',
        }),
        sortable: true,
        align: RIGHT_ALIGNMENT,
        width: '9em',
        render: (durationMs: number) => formatSessionDuration(durationMs),
      },
      {
        field: 'pageViewCount',
        name: i18n.translate('xpack.digitalExperience.sessions.table.pagesColumn', {
          defaultMessage: 'Pages',
        }),
        sortable: true,
        align: RIGHT_ALIGNMENT,
        width: '6em',
        render: (count: number) => formatNumber(count),
      },
      {
        field: 'clickCount',
        name: i18n.translate('xpack.digitalExperience.sessions.table.clicksColumn', {
          defaultMessage: 'Clicks',
        }),
        sortable: true,
        align: RIGHT_ALIGNMENT,
        width: '6em',
        render: (count: number) => formatNumber(count),
      },
      {
        field: 'errorCount',
        name: i18n.translate('xpack.digitalExperience.sessions.table.errorsColumn', {
          defaultMessage: 'Errors',
        }),
        sortable: true,
        align: RIGHT_ALIGNMENT,
        width: '6em',
        render: (count: number) =>
          count > 0 ? (
            <EuiBadge color="danger" data-test-subj="digitalExperienceSessionErrors">
              {formatNumber(count)}
            </EuiBadge>
          ) : (
            formatNumber(count)
          ),
      },
    ],
    [formatDate, formatNumber, sessionHref]
  );

  const onTableChange = ({ page, sort }: CriteriaWithPagination<SessionSummary>) => {
    const sortField = sort ? SORT_FIELDS[sort.field as SortableColumn] : undefined;
    if (sortField && (sortField !== state.sortField || sort?.direction !== state.sortDirection)) {
      onChange({ sortField, sortDirection: sort?.direction });
      return;
    }
    if (page.size !== state.perPage) {
      onChange({ perPage: String(page.size) });
      return;
    }
    if (page.index !== state.page) {
      // The first page is the default, so it leaves the URL.
      onChange({ page: page.index > 0 ? String(page.index) : undefined });
    }
  };

  return (
    <EuiBasicTable<SessionSummary>
      data-test-subj="digitalExperienceSessionsTable"
      tableCaption={i18n.translate('xpack.digitalExperience.sessions.table.caption', {
        defaultMessage: 'Sessions',
      })}
      items={sessions}
      itemId="sessionId"
      columns={columns}
      loading={isLoading}
      noItemsMessage={noItemsMessage}
      sorting={{
        sort: { field: columnOfSortField(state.sortField), direction: state.sortDirection },
      }}
      pagination={{
        pageIndex: state.page,
        pageSize: state.perPage,
        pageSizeOptions: [...SESSIONS_PAGE_SIZES],
        totalItemCount: Math.min(total, MAX_LISTED_SESSIONS),
      }}
      onChange={onTableChange}
      rowProps={({ sessionId }) => ({
        'data-test-subj': `digitalExperienceSessionRow-${sessionId}`,
      })}
    />
  );
}
