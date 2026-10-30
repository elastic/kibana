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
  EuiCode,
  EuiLink,
  EuiText,
  EuiTextColor,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import type {
  CriteriaWithPagination,
  EuiBasicTableColumn,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import type { CoreWebVital } from '../../../../common/core_web_vitals';
import type { SessionSortField, SessionSummary } from '../../../../common/sessions';
import { VITAL_LABELS, WebVitalBadge } from '../../../components/web_vital_badges';
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

/** City, region and country, as far as they're known, e.g. "Amsterdam, North Holland, NL". */
export const locationOf = ({ geo }: Pick<SessionSummary, 'geo'>): string | null =>
  [geo.city, geo.region, geo.countryIso].filter(Boolean).join(', ') || null;

const VITAL_COLUMNS = ['lcp', 'inp', 'cls'] as const satisfies readonly CoreWebVital[];

export type SessionsOptionalColumnId =
  | 'journey'
  | 'duration'
  | 'pages'
  | 'clicks'
  | 'errors'
  | 'location'
  | 'entryPage'
  | 'exitPage'
  | 'device'
  | 'sessionId'
  | 'endTime'
  | 'events'
  | 'bounced'
  | (typeof VITAL_COLUMNS)[number];

const COLUMN_LABELS: Record<SessionsOptionalColumnId, string> = {
  journey: i18n.translate('xpack.digitalExperience.sessions.table.journeyColumn', {
    defaultMessage: 'Journey',
  }),
  duration: i18n.translate('xpack.digitalExperience.sessions.table.durationColumn', {
    defaultMessage: 'Duration',
  }),
  pages: i18n.translate('xpack.digitalExperience.sessions.table.pagesColumn', {
    defaultMessage: 'Pages',
  }),
  clicks: i18n.translate('xpack.digitalExperience.sessions.table.clicksColumn', {
    defaultMessage: 'Clicks',
  }),
  errors: i18n.translate('xpack.digitalExperience.sessions.table.errorsColumn', {
    defaultMessage: 'Errors',
  }),
  location: i18n.translate('xpack.digitalExperience.sessions.table.locationColumn', {
    defaultMessage: 'Location',
  }),
  entryPage: i18n.translate('xpack.digitalExperience.sessions.table.entryPageColumn', {
    defaultMessage: 'Entry page',
  }),
  exitPage: i18n.translate('xpack.digitalExperience.sessions.table.exitPageColumn', {
    defaultMessage: 'Exit page',
  }),
  device: i18n.translate('xpack.digitalExperience.sessions.table.deviceColumn', {
    defaultMessage: 'Device',
  }),
  sessionId: i18n.translate('xpack.digitalExperience.sessions.table.sessionIdColumn', {
    defaultMessage: 'Session ID',
  }),
  endTime: i18n.translate('xpack.digitalExperience.sessions.table.endTimeColumn', {
    defaultMessage: 'Last activity',
  }),
  events: i18n.translate('xpack.digitalExperience.sessions.table.eventsColumn', {
    defaultMessage: 'Events',
  }),
  bounced: i18n.translate('xpack.digitalExperience.sessions.table.bouncedColumn', {
    defaultMessage: 'Bounced',
  }),
  lcp: VITAL_LABELS.lcp,
  inp: VITAL_LABELS.inp,
  cls: VITAL_LABELS.cls,
};

/** The columns the user can show or hide, in display order; start time and user always show. */
export const SESSIONS_OPTIONAL_COLUMNS: ReadonlyArray<{
  id: SessionsOptionalColumnId;
  label: string;
}> = (
  [
    'journey',
    'duration',
    'pages',
    'clicks',
    'errors',
    'location',
    'entryPage',
    'exitPage',
    'device',
    'sessionId',
    'endTime',
    'events',
    'bounced',
    ...VITAL_COLUMNS,
  ] as const
).map((id) => ({ id, label: COLUMN_LABELS[id] }));

export const SESSIONS_OPTIONAL_COLUMN_IDS = SESSIONS_OPTIONAL_COLUMNS.map(({ id }) => id);

/** Shown until the user picks columns: the summary's counts, not the details. */
export const SESSIONS_HIDDEN_BY_DEFAULT: readonly SessionsOptionalColumnId[] = [
  'location',
  'entryPage',
  'exitPage',
  'device',
  'sessionId',
  'endTime',
  'events',
  'bounced',
  ...VITAL_COLUMNS,
];

const YES = i18n.translate('xpack.digitalExperience.sessions.table.yesValue', {
  defaultMessage: 'Yes',
});
const NO = i18n.translate('xpack.digitalExperience.sessions.table.noValue', {
  defaultMessage: 'No',
});

/** A page path in code font, truncated with the full path in its title. */
const renderPage = (page: string | null) =>
  page ? (
    <EuiText size="xs" className="eui-textTruncate" title={page}>
      <EuiCode transparentBackground>{page}</EuiCode>
    </EuiText>
  ) : (
    <EmptyCellValue />
  );

const renderText = (text: string | null) =>
  text ? (
    <span className="eui-textTruncate" title={text}>
      {text}
    </span>
  ) : (
    <EmptyCellValue />
  );

/** Right-aligned like APM's lists, on one line so the table scrolls rather than wraps. */
const numberColumn = (
  width = '6em'
): Pick<
  EuiTableFieldDataColumnType<SessionSummary>,
  'align' | 'width' | 'minWidth' | 'className'
> => ({
  align: RIGHT_ALIGNMENT,
  width,
  minWidth: width,
  className: 'eui-textNoWrap',
});

/** A Core Web Vital of the session, colored by its rating. */
const vitalColumn = (
  vital: (typeof VITAL_COLUMNS)[number]
): EuiTableFieldDataColumnType<SessionSummary> => ({
  field: `webVitals.${vital}`,
  name: COLUMN_LABELS[vital],
  ...numberColumn('7em'),
  render: (value: number | null) =>
    value === null ? (
      <EmptyCellValue />
    ) : (
      <WebVitalBadge vital={vital} value={value} showLabel={false} />
    ),
});

export function SessionsTable({
  sessions,
  total,
  state,
  isLoading,
  noItemsMessage,
  formatters: { formatDate, formatNumber },
  sessionHref,
  visibleColumns,
  onChange,
}: {
  sessions: SessionSummary[];
  total: number;
  state: SessionsListState;
  isLoading: boolean;
  noItemsMessage: ReactNode;
  formatters: Formatters;
  sessionHref: (sessionId: string) => string;
  visibleColumns: ReadonlySet<SessionsOptionalColumnId>;
  onChange: (patch: {
    sortField?: string;
    sortDirection?: string;
    page?: string;
    perPage?: string;
  }) => void;
}) {
  const columns = useMemo<Array<EuiBasicTableColumn<SessionSummary>>>(() => {
    const fixedColumns: Array<EuiBasicTableColumn<SessionSummary>> = [
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
    ];

    const renderCount = (count: number) => formatNumber(count);
    const optionalColumns: Record<SessionsOptionalColumnId, EuiBasicTableColumn<SessionSummary>> = {
      journey: {
        field: 'journey',
        name: COLUMN_LABELS.journey,
        render: (journey: string[], { entryPage, exitPage }: SessionSummary) => (
          <JourneyTrail journey={journey} entryPage={entryPage} exitPage={exitPage} />
        ),
      },
      duration: {
        field: 'durationMs',
        name: COLUMN_LABELS.duration,
        sortable: true,
        ...numberColumn('9em'),
        render: (durationMs: number) => formatSessionDuration(durationMs),
      },
      pages: {
        field: 'pageViewCount',
        name: COLUMN_LABELS.pages,
        sortable: true,
        ...numberColumn(),
        render: renderCount,
      },
      clicks: {
        field: 'clickCount',
        name: COLUMN_LABELS.clicks,
        sortable: true,
        ...numberColumn(),
        render: renderCount,
      },
      errors: {
        field: 'errorCount',
        name: COLUMN_LABELS.errors,
        sortable: true,
        ...numberColumn(),
        render: (count: number) =>
          count > 0 ? (
            <EuiBadge color="danger" data-test-subj="digitalExperienceSessionErrors">
              {formatNumber(count)}
            </EuiBadge>
          ) : (
            formatNumber(count)
          ),
      },
      location: {
        field: 'geo',
        name: COLUMN_LABELS.location,
        width: '14em',
        render: (_geo: SessionSummary['geo'], session: SessionSummary) =>
          renderText(locationOf(session)),
      },
      entryPage: {
        field: 'entryPage',
        name: COLUMN_LABELS.entryPage,
        width: '12em',
        render: renderPage,
      },
      exitPage: {
        field: 'exitPage',
        name: COLUMN_LABELS.exitPage,
        width: '12em',
        render: renderPage,
      },
      device: {
        field: 'userAgent',
        name: COLUMN_LABELS.device,
        width: '9em',
        render: ({ device }: SessionSummary['userAgent']) => renderText(device),
      },
      sessionId: {
        field: 'sessionId',
        name: COLUMN_LABELS.sessionId,
        width: '12em',
        render: (sessionId: string) => (
          <EuiText size="xs" className="eui-textTruncate" title={sessionId}>
            <EuiCode transparentBackground>{sessionId}</EuiCode>
          </EuiText>
        ),
      },
      endTime: {
        field: 'endTime',
        name: COLUMN_LABELS.endTime,
        width: '18em',
        className: 'eui-textNoWrap',
        render: (endTime: string) => formatDate(endTime),
      },
      events: {
        field: 'eventCount',
        name: COLUMN_LABELS.events,
        ...numberColumn(),
        render: renderCount,
      },
      bounced: {
        field: 'bounced',
        name: COLUMN_LABELS.bounced,
        width: '6em',
        render: (bounced: boolean) => (bounced ? YES : NO),
      },
      lcp: vitalColumn('lcp'),
      inp: vitalColumn('inp'),
      cls: vitalColumn('cls'),
    };

    return [
      ...fixedColumns,
      ...SESSIONS_OPTIONAL_COLUMN_IDS.filter((id) => visibleColumns.has(id)).map(
        (id) => optionalColumns[id]
      ),
    ];
  }, [formatDate, formatNumber, sessionHref, visibleColumns]);

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
      // Many columns: they keep their width and the table scrolls sideways instead of squeezing.
      tableLayout="auto"
      scrollableInline
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
