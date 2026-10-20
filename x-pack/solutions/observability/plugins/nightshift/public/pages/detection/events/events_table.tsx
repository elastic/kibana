/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiTextBlockTruncate,
  EuiToolTip,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { FormattedRelative } from '@kbn/i18n-react';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import type { SignificantEventsSortField } from '@kbn/significant-events-plugin/common';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import React, { useMemo } from 'react';
import {
  NIGHTSHIFT_EBT_ACTIONS,
  NIGHTSHIFT_EBT_DETAILS,
  NIGHTSHIFT_EBT_ELEMENTS,
} from '../../../common/ebt_constants';
import { useFormatTimestamp } from '../../../common/format_timestamp';
import {
  getInvestigationState,
  isNeedsActionStatus,
  SIGNIFICANT_EVENT_INVESTIGATION_STATE_LABELS,
  SIGNIFICANT_EVENT_STATUS_ICONS,
  SIGNIFICANT_EVENT_STATUS_LABELS,
} from '../../../components/entities/significant_event/significant_event_status';
import { SeverityBadge } from '../../../components/ui/severity_badge';
import { useBlocksNewActivity } from '../../../data/maintenance/use_significant_events_maintenance';
import { useTriggerEventInvestigation } from '../../../data/significant_events/use_trigger_event_investigation';
import { useKibana } from '../../../hooks/use_kibana';
import {
  ACTIONS_COLUMN_LABEL,
  EVENT_COLUMN_LABEL,
  EVENTS_TABLE_CAPTION,
  INVESTIGATION_COLUMN_LABEL,
  RUN_INVESTIGATION_LABEL,
  SEVERITY_COLUMN_LABEL,
  STATUS_COLUMN_LABEL,
  TIME_COLUMN_LABEL,
  VIEW_EVENT_LABEL,
} from './translations';
import type { EventsSort } from './use_events_url_state';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

/** Table columns that map to a server sort field. */
const SORTABLE_COLUMNS: Record<string, SignificantEventsSortField> = {
  created_at: 'created_at',
  status: 'status',
  severity: 'severity',
};

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
  onTitleLinkMount: (
    eventId: string,
    element: HTMLAnchorElement | HTMLButtonElement | null
  ) => void;
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
  onTitleLinkMount,
}: EventsTableProps): React.ReactElement => {
  const formatTimestamp = useFormatTimestamp();
  const { application } = useKibana().services;
  const { canManage } = getNightshiftCapabilities(application.capabilities.nightshift);
  const { blocksActivity, activityBlockTooltip } = useBlocksNewActivity();
  const { triggerInvestigation, triggeringEventId } = useTriggerEventInvestigation();
  const columns = useMemo<Array<EuiBasicTableColumn<SignificantEventResponse>>>(
    () => [
      {
        field: 'title',
        name: EVENT_COLUMN_LABEL,
        width: '45%',
        render: (title: string, event: SignificantEventResponse) => (
          <div>
            <EuiText size="s">
              <EuiLink
                color="text"
                ref={(element) => onTitleLinkMount(event.event_id, element)}
                data-test-subj={`nightshiftDetectionEventLink-${event.event_id}`}
                onClick={(clickEvent: React.MouseEvent) => {
                  clickEvent.stopPropagation();
                  onEventClick(event);
                }}
                {...getEbtProps({
                  action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SIGNIFICANT_EVENT,
                  element: NIGHTSHIFT_EBT_ELEMENTS.SIGNIFICANT_EVENTS_LIST,
                  detail: isNeedsActionStatus(event.status)
                    ? NIGHTSHIFT_EBT_DETAILS.NEEDS_ACTION
                    : NIGHTSHIFT_EBT_DETAILS.RESOLVED,
                })}
              >
                <strong>{title}</strong>
              </EuiLink>
            </EuiText>
            <EuiText size="xs" color="subdued">
              <EuiTextBlockTruncate lines={2}>{event.summary}</EuiTextBlockTruncate>
            </EuiText>
          </div>
        ),
      },
      {
        field: 'created_at',
        name: TIME_COLUMN_LABEL,
        sortable: true,
        render: (createdAt: string) => (
          <EuiToolTip content={formatTimestamp(createdAt)}>
            <span tabIndex={0}>
              <FormattedRelative value={createdAt} />
            </span>
          </EuiToolTip>
        ),
      },
      {
        field: 'status',
        name: STATUS_COLUMN_LABEL,
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
        name: SEVERITY_COLUMN_LABEL,
        sortable: true,
        render: (severity: SignificantEventResponse['severity']) => (
          <SeverityBadge severity={severity} />
        ),
      },
      {
        name: INVESTIGATION_COLUMN_LABEL,
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
          // Not investigated yet: start one here. Otherwise open the event and its investigation.
          if (canManage && getInvestigationState(event) === 'not_started') {
            return (
              <EuiToolTip
                content={activityBlockTooltip ?? RUN_INVESTIGATION_LABEL}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  iconType="inspect"
                  aria-label={RUN_INVESTIGATION_LABEL}
                  isDisabled={blocksActivity || triggeringEventId != null}
                  isLoading={triggeringEventId === event.event_id}
                  onClick={(clickEvent: React.MouseEvent<HTMLButtonElement>) => {
                    clickEvent.stopPropagation();
                    triggerInvestigation(event.event_id);
                  }}
                  data-test-subj={`nightshiftRunEventInvestigation-${event.event_id}`}
                  {...getEbtProps({
                    action: NIGHTSHIFT_EBT_ACTIONS.START_INVESTIGATION,
                    element: NIGHTSHIFT_EBT_ELEMENTS.SIGNIFICANT_EVENTS_LIST,
                    detail: isNeedsActionStatus(event.status)
                      ? NIGHTSHIFT_EBT_DETAILS.NEEDS_ACTION
                      : NIGHTSHIFT_EBT_DETAILS.RESOLVED,
                  })}
                />
              </EuiToolTip>
            );
          }
          return (
            <EuiToolTip content={VIEW_EVENT_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="eye"
                color="text"
                aria-label={VIEW_EVENT_LABEL}
                onClick={(clickEvent: React.MouseEvent<HTMLButtonElement>) => {
                  clickEvent.stopPropagation();
                  onEventClick(event);
                }}
                data-test-subj={`nightshiftViewEvent-${event.event_id}`}
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
    [
      activityBlockTooltip,
      blocksActivity,
      canManage,
      formatTimestamp,
      onEventClick,
      onTitleLinkMount,
      triggerInvestigation,
      triggeringEventId,
    ]
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
        const nextSortField = nextSort ? SORTABLE_COLUMNS[String(nextSort.field)] : undefined;
        if (
          nextSort &&
          nextSortField &&
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
      noItemsMessage=""
    />
  );
};
