/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiBasicTable, EuiText } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MobileSessionEventKind, SessionTimelineEvent } from '../../../../common/sessions';
import type { MobileCrash } from '../../../../common/types/mobile';
import { formatElapsed, urlWithoutQuery } from '../../session_detail/utils/visit_activity';

type CrashTimelineKind = MobileSessionEventKind | 'crash';

const KIND_LABELS: Record<CrashTimelineKind, string> = {
  screen: i18n.translate('xpack.digitalExperience.mobile.crashes.timeline.screen', {
    defaultMessage: 'Screen',
  }),
  tap: i18n.translate('xpack.digitalExperience.mobile.crashes.timeline.tap', {
    defaultMessage: 'Tap',
  }),
  request: i18n.translate('xpack.digitalExperience.mobile.crashes.timeline.request', {
    defaultMessage: 'Request',
  }),
  error: i18n.translate('xpack.digitalExperience.mobile.crashes.timeline.error', {
    defaultMessage: 'Error',
  }),
  log: i18n.translate('xpack.digitalExperience.mobile.crashes.timeline.log', {
    defaultMessage: 'Log',
  }),
  crash: i18n.translate('xpack.digitalExperience.mobile.crashes.timeline.crash', {
    defaultMessage: 'Crash',
  }),
};

const KIND_COLORS: Partial<Record<CrashTimelineKind, string>> = {
  error: 'warning',
  crash: 'danger',
};

const WHEN_LABEL = i18n.translate('xpack.digitalExperience.mobile.crashes.timeline.when', {
  defaultMessage: 'Before the crash',
});

const EVENT_LABEL = i18n.translate('xpack.digitalExperience.mobile.crashes.timeline.event', {
  defaultMessage: 'Event',
});

const DETAIL_LABEL = i18n.translate('xpack.digitalExperience.mobile.crashes.timeline.detail', {
  defaultMessage: 'Detail',
});

const CRASH_MOMENT_LABEL = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.timeline.crashMoment',
  { defaultMessage: 'At the crash' }
);

const elapsedBefore = (elapsed: string) =>
  i18n.translate('xpack.digitalExperience.mobile.crashes.timeline.elapsedBefore', {
    defaultMessage: '{elapsed} before',
    values: { elapsed },
  });

interface TimelineRow {
  id: string;
  kind: CrashTimelineKind;
  /** How long before the crash; 0 for the crash. */
  beforeMs: number;
  name: string;
  page: string | null;
  detail: string | null;
  statusCode: number | null;
}

const isMobileKind = (kind: SessionTimelineEvent['kind']): kind is MobileSessionEventKind =>
  kind in KIND_LABELS && kind !== 'crash';

const toRows = (events: SessionTimelineEvent[], crash: MobileCrash): TimelineRow[] => {
  const crashMs = Date.parse(crash.time);
  return [
    ...events.flatMap(({ kind, ...event }, index) => {
      if (!isMobileKind(kind)) {
        return [];
      }
      return [
        {
          id: `${index}`,
          kind,
          beforeMs: crashMs - Date.parse(event.timestamp),
          name: event.name,
          page: event.page,
          detail: kind === 'request' && event.detail ? urlWithoutQuery(event.detail) : event.detail,
          statusCode: event.statusCode ?? null,
        },
      ];
    }),
    {
      id: 'crash',
      kind: 'crash',
      beforeMs: 0,
      name: crash.type ?? KIND_LABELS.crash,
      page: null,
      detail: crash.message,
      statusCode: null,
    },
  ];
};

const columns: Array<EuiBasicTableColumn<TimelineRow>> = [
  {
    field: 'beforeMs',
    name: WHEN_LABEL,
    width: '9em',
    className: 'eui-textNoWrap',
    render: (beforeMs: number) =>
      beforeMs === 0 ? CRASH_MOMENT_LABEL : elapsedBefore(formatElapsed(beforeMs)),
  },
  {
    field: 'kind',
    name: EVENT_LABEL,
    width: '7em',
    render: (kind: CrashTimelineKind) => (
      <EuiBadge color={KIND_COLORS[kind] ?? 'hollow'}>{KIND_LABELS[kind]}</EuiBadge>
    ),
  },
  {
    field: 'name',
    name: DETAIL_LABEL,
    render: (name: string, { detail, page, statusCode }: TimelineRow) => (
      <div className="eui-textTruncate">
        <EuiText size="xs" className="eui-textTruncate">
          <strong>{name}</strong>
          {statusCode !== null && (
            <>
              {' '}
              <EuiBadge color={statusCode >= 400 ? 'danger' : 'hollow'}>{statusCode}</EuiBadge>
            </>
          )}{' '}
          {detail && <span title={detail}>{detail}</span>}
        </EuiText>
        {page && (
          <EuiText size="xs" color="subdued">
            {page}
          </EuiText>
        )}
      </div>
    ),
  },
];

/** What the latest crash's session did before it, oldest first, the crash as its last row. */
export function CrashTimeline({
  events,
  crash,
}: {
  events: SessionTimelineEvent[];
  crash: MobileCrash;
}) {
  return (
    <EuiBasicTable<TimelineRow>
      tableCaption={WHEN_LABEL}
      items={toRows(events, crash)}
      itemId="id"
      columns={columns}
      compressed
      data-test-subj="digitalExperienceMobileCrashTimeline"
    />
  );
}
