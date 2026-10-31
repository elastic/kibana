/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiTextBlockTruncate,
  EuiToolTip,
  useEuiTheme,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { selectUnit } from '@formatjs/intl-utils';
import { getEbtProps } from '@kbn/ebt-click';
import { FormattedRelativeTime } from '@kbn/i18n-react';
import { isSignificantEventsSortField } from '@kbn/significant-events-plugin/common';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import React, { useMemo } from 'react';
import {
  NIGHTSHIFT_EBT_ACTIONS,
  NIGHTSHIFT_EBT_DETAILS,
  NIGHTSHIFT_EBT_ELEMENTS,
} from '../../../common/ebt_constants';
import { useFormatTimestamp } from '../../../hooks/use_format_timestamp';
import {
  isNeedsActionStatus,
  SIGNIFICANT_EVENT_INVESTIGATION_STATE_LABELS,
  SIGNIFICANT_EVENT_STATUS_ICONS,
  SIGNIFICANT_EVENT_STATUS_LABELS,
} from '../../../components/entities/significant_event/significant_event_status';
import { SeverityBadge } from '../../../components/ui/severity_badge';
import { getInvestigationState } from '../../../data/significant_events/investigation_state';
import {
  ACTIONS_COLUMN_LABEL,
  EVENT_COLUMN_LABEL,
  EVENTS_TABLE_CAPTION,
  INVESTIGATE_LABEL,
  INVESTIGATION_LABEL,
  LOADING_EVENTS_MESSAGE,
  SEVERITY_LABEL,
  STATUS_LABEL,
  TIME_COLUMN_LABEL,
  TIME_COLUMN_TOOLTIP,
  VIEW_INVESTIGATION_LABEL,
} from './translations';
import type { EventsSort } from './use_events_url_state';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export interface EventsTableProps {
  events: SignificantEventResponse[];
  total: number;
  page: number;
  perPage: number;
  sort: EventsSort;
  isLoading: boolean;
  selectedEventId?: string;
  onEventClick: (event: SignificantEventResponse) => void;
  onPageChange: (page: number, perPage: number) => void;
  onSortChange: (sort: EventsSort) => void;
  onOpenButtonMount: (eventId: string, element: HTMLButtonElement | null) => void;
}

export const EventsTable = ({
  events,
  total,
  page,
  perPage,
  sort,
  isLoading,
  selectedEventId,
  onEventClick,
  onPageChange,
  onSortChange,
  onOpenButtonMount,
}: EventsTableProps): React.ReactElement => {
  const formatTimestamp = useFormatTimestamp();
  const { euiTheme } = useEuiTheme();
  const columns = useMemo<Array<EuiBasicTableColumn<SignificantEventResponse>>>(
    () => [
      {
        field: 'title',
        name: EVENT_COLUMN_LABEL,
        width: '320px',
        render: (title: string, event: SignificantEventResponse) => (
          <div
            css={css`
              padding-block: ${euiTheme.size.s};
            `}
          >
            <EuiText size="s">
              <EuiTextBlockTruncate lines={2} cloneElement>
                <strong title={title}>{title}</strong>
              </EuiTextBlockTruncate>
            </EuiText>
            <EuiText size="xs" color="subdued">
              <EuiTextBlockTruncate lines={2} title={event.summary}>
                {event.summary}
              </EuiTextBlockTruncate>
            </EuiText>
          </div>
        ),
      },
      {
        field: 'created_at',
        name: TIME_COLUMN_LABEL,
        nameTooltip: { content: TIME_COLUMN_TOOLTIP },
        width: '9em',
        sortable: true,
        render: (createdAt: string) => {
          const time = Date.parse(createdAt);
          if (Number.isNaN(time)) {
            return <EuiText size="s">{formatTimestamp(createdAt)}</EuiText>;
          }
          const { value, unit } = selectUnit(time);
          return (
            <EuiToolTip content={formatTimestamp(createdAt)}>
              <EuiText size="s" tabIndex={0}>
                <FormattedRelativeTime value={value} unit={unit} numeric="always" style="short" />
              </EuiText>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'status',
        name: STATUS_LABEL,
        width: '11em',
        sortable: true,
        render: (status: SignificantEventResponse['status']) => (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon
                type={SIGNIFICANT_EVENT_STATUS_ICONS[status].iconType}
                color={SIGNIFICANT_EVENT_STATUS_ICONS[status].color}
                aria-hidden={true}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText
                size="s"
                color={
                  SIGNIFICANT_EVENT_STATUS_ICONS[status].color === 'primary' ? 'default' : 'subdued'
                }
              >
                {SIGNIFICANT_EVENT_STATUS_LABELS[status]}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'severity',
        name: SEVERITY_LABEL,
        width: '8em',
        sortable: true,
        render: (severity: SignificantEventResponse['severity']) => (
          <SeverityBadge severity={severity} textSize="s" />
        ),
      },
      {
        name: INVESTIGATION_LABEL,
        width: '10em',
        render: (event: SignificantEventResponse) => {
          const state = getInvestigationState(event);
          const label = SIGNIFICANT_EVENT_INVESTIGATION_STATE_LABELS[state];
          if (state === 'in_progress') {
            return (
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="s" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="primary">
                    {label}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          }
          return (
            <EuiText size="s" color={state === 'not_started' ? 'subdued' : 'default'}>
              {label}
            </EuiText>
          );
        },
      },
      {
        name: ACTIONS_COLUMN_LABEL,
        width: '80px',
        align: 'right',
        render: (event: SignificantEventResponse) => {
          // Both open the event; the flyout runs, restarts and reviews investigations.
          const hasInvestigation = getInvestigationState(event) !== 'not_started';
          const label = hasInvestigation ? VIEW_INVESTIGATION_LABEL : INVESTIGATE_LABEL;
          return (
            <EuiToolTip content={label} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType={hasInvestigation ? 'eye' : 'inspect'}
                color={hasInvestigation ? 'text' : 'primary'}
                aria-label={label}
                buttonRef={(element: HTMLButtonElement | null) =>
                  onOpenButtonMount(event.event_id, element)
                }
                onClick={(clickEvent: React.MouseEvent<HTMLButtonElement>) => {
                  clickEvent.stopPropagation();
                  onEventClick(event);
                }}
                data-test-subj={`nightshiftOpenEvent-${event.event_id}`}
                {...getEbtProps({
                  action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SIGNIFICANT_EVENT,
                  element: NIGHTSHIFT_EBT_ELEMENTS.SIGNIFICANT_EVENTS_LIST,
                  detail: isNeedsActionStatus(event.status)
                    ? NIGHTSHIFT_EBT_DETAILS.NEEDS_ACTION
                    : NIGHTSHIFT_EBT_DETAILS.RESOLVED,
                })}
              />
            </EuiToolTip>
          );
        },
      },
    ],
    [euiTheme, formatTimestamp, onEventClick, onOpenButtonMount]
  );

  return (
    <EuiBasicTable<SignificantEventResponse>
      data-test-subj="nightshiftDetectionEventsTable"
      tableCaption={EVENTS_TABLE_CAPTION}
      itemId="event_id"
      items={events}
      columns={columns}
      loading={isLoading}
      sorting={{ sort: { field: sort.field, direction: sort.order } }}
      pagination={{
        pageIndex: page - 1,
        pageSize: perPage,
        totalItemCount: total,
        pageSizeOptions: PAGE_SIZE_OPTIONS,
      }}
      onChange={({
        page: nextPage,
        sort: nextSort,
      }: CriteriaWithPagination<SignificantEventResponse>) => {
        const nextSortField = nextSort?.field;
        if (
          nextSort &&
          isSignificantEventsSortField(nextSortField) &&
          (nextSortField !== sort.field || nextSort.direction !== sort.order)
        ) {
          onSortChange({ field: nextSortField, order: nextSort.direction });
          return;
        }
        if (nextPage) {
          onPageChange(nextPage.index + 1, nextPage.size);
        }
      }}
      rowProps={(event) => ({
        isSelected: event.event_id === selectedEventId,
        'data-test-subj': `nightshiftDetectionEventRow-${event.event_id}`,
        onClick: () => onEventClick(event),
      })}
      noItemsMessage={isLoading ? LOADING_EVENTS_MESSAGE : ''}
    />
  );
};
