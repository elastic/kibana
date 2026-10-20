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
  EuiHealth,
  EuiLink,
  EuiText,
  EuiTextTruncate,
  EuiToolTip,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import React, { useMemo, useState } from 'react';
import { useFormatTimestamp } from '../../../common/format_timestamp';
import {
  getStatusColor,
  isInvestigationRunning,
  isNeedsActionStatus,
} from '../../../components/entities/significant_event/significant_event_status';
import { MarkSignificantEventInactiveModal } from '../../../components/entities/significant_event/mark_significant_event_inactive_modal';
import { SeverityBadge } from '../../../components/ui/severity_badge';
import { useBlocksNewActivity } from '../../../data/maintenance/use_significant_events_maintenance';
import { useTriggerEventInvestigation } from '../../../data/significant_events/use_trigger_event_investigation';
import { useSourcesById } from '../../../data/sources/use_sources_by_id';
import { useKibana } from '../../../hooks/use_kibana';
import { InvestigationStatusBadge } from '../../../investigation/investigation_status_badge';
import {
  NIGHTSHIFT_EBT_ACTIONS,
  NIGHTSHIFT_EBT_DETAILS,
  NIGHTSHIFT_EBT_ELEMENTS,
} from '../../../common/ebt_constants';
import {
  ACTIONS_COLUMN_LABEL,
  CREATED_COLUMN_LABEL,
  EVENT_COLUMN_LABEL,
  EVENTS_TABLE_CAPTION,
  INVESTIGATION_COLUMN_LABEL,
  MARK_INACTIVE_LABEL,
  RESTART_INVESTIGATION_LABEL,
  RESTART_INVESTIGATION_TOOLTIP,
  RUN_INVESTIGATION_LABEL,
  SEVERITY_COLUMN_LABEL,
  SOURCES_COLUMN_LABEL,
  STATUS_COLUMN_LABEL,
  STATUS_LABELS,
} from './translations';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export interface EventsTableProps {
  events: SignificantEventResponse[];
  total: number;
  page: number;
  perPage: number;
  isLoading: boolean;
  selectedEventId?: string;
  onEventClick: (event: SignificantEventResponse) => void;
  onPageChange: (page: number, perPage: number) => void;
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
  isLoading,
  selectedEventId,
  onEventClick,
  onPageChange,
  onTitleLinkMount,
}: EventsTableProps): React.ReactElement => {
  const formatTimestamp = useFormatTimestamp();
  const { getSourceTitle } = useSourcesById();
  const { application } = useKibana().services;
  const { canManage } = getNightshiftCapabilities(application.capabilities.nightshift);
  const { blocksActivity, activityBlockTooltip } = useBlocksNewActivity();
  const { triggerInvestigation, triggeringEventId } = useTriggerEventInvestigation();
  const [eventToMarkInactive, setEventToMarkInactive] = useState<string>();
  const columns = useMemo<Array<EuiBasicTableColumn<SignificantEventResponse>>>(
    () => [
      {
        field: 'title',
        name: EVENT_COLUMN_LABEL,
        render: (title: string, event: SignificantEventResponse) => (
          <>
            <EuiLink
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
              {title}
            </EuiLink>
            <EuiText size="xs" color="subdued">
              <EuiTextTruncate text={event.summary} />
            </EuiText>
          </>
        ),
      },
      {
        field: 'severity',
        name: SEVERITY_COLUMN_LABEL,
        width: '120px',
        render: (severity: SignificantEventResponse['severity']) => (
          <SeverityBadge severity={severity} />
        ),
      },
      {
        field: 'status',
        name: STATUS_COLUMN_LABEL,
        width: '120px',
        render: (status: SignificantEventResponse['status']) => (
          <EuiHealth color={getStatusColor(status)}>{STATUS_LABELS[status]}</EuiHealth>
        ),
      },
      {
        name: INVESTIGATION_COLUMN_LABEL,
        width: '140px',
        render: (event: SignificantEventResponse) => <InvestigationStatusBadge event={event} />,
      },
      {
        field: 'source_ids',
        name: SOURCES_COLUMN_LABEL,
        width: '180px',
        render: (sourceIds: string[]) => {
          const [firstSourceId, ...remainingSourceIds] = sourceIds;
          if (!firstSourceId) {
            return null;
          }
          const remainingLabel =
            remainingSourceIds.length > 0 ? ` +${remainingSourceIds.length}` : '';
          return `${getSourceTitle(firstSourceId)}${remainingLabel}`;
        },
      },
      {
        field: 'created_at',
        name: CREATED_COLUMN_LABEL,
        width: '180px',
        render: (createdAt: string) => formatTimestamp(createdAt),
      },
      ...(canManage
        ? [
            {
              name: ACTIONS_COLUMN_LABEL,
              width: '112px',
              align: 'right' as const,
              render: (event: SignificantEventResponse) => {
                const investigationRunning = isInvestigationRunning(event);
                const investigationLabel = investigationRunning
                  ? RESTART_INVESTIGATION_LABEL
                  : RUN_INVESTIGATION_LABEL;
                const isTriggering = triggeringEventId === event.event_id;

                return (
                  <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        content={
                          activityBlockTooltip ??
                          (investigationRunning
                            ? RESTART_INVESTIGATION_TOOLTIP
                            : RUN_INVESTIGATION_LABEL)
                        }
                        disableScreenReaderOutput
                      >
                        <EuiButtonIcon
                          iconType="inspect"
                          aria-label={investigationLabel}
                          isDisabled={blocksActivity || triggeringEventId != null}
                          isLoading={isTriggering}
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
                    </EuiFlexItem>
                    {isNeedsActionStatus(event.status) ? (
                      <EuiFlexItem grow={false}>
                        <EuiToolTip content={MARK_INACTIVE_LABEL} disableScreenReaderOutput>
                          <EuiButtonIcon
                            iconType="eyeSlash"
                            color="danger"
                            aria-label={MARK_INACTIVE_LABEL}
                            onClick={(clickEvent: React.MouseEvent<HTMLButtonElement>) => {
                              clickEvent.stopPropagation();
                              setEventToMarkInactive(event.event_id);
                            }}
                            data-test-subj={`nightshiftMarkEventInactive-${event.event_id}`}
                            {...getEbtProps({
                              action: NIGHTSHIFT_EBT_ACTIONS.CLOSE_SIGNIFICANT_EVENT,
                              element: NIGHTSHIFT_EBT_ELEMENTS.SIGNIFICANT_EVENTS_LIST,
                              detail: NIGHTSHIFT_EBT_DETAILS.NEEDS_ACTION,
                            })}
                          />
                        </EuiToolTip>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                );
              },
            },
          ]
        : []),
    ],
    [
      activityBlockTooltip,
      blocksActivity,
      canManage,
      formatTimestamp,
      getSourceTitle,
      onEventClick,
      onTitleLinkMount,
      triggerInvestigation,
      triggeringEventId,
    ]
  );

  return (
    <>
      <EuiBasicTable<SignificantEventResponse>
        data-test-subj="nightshiftDetectionEventsTable"
        tableCaption={EVENTS_TABLE_CAPTION}
        itemId="event_id"
        items={events}
        columns={columns}
        loading={isLoading}
        pagination={{
          pageIndex: page - 1,
          pageSize: perPage,
          totalItemCount: total,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
        onChange={({ page: nextPage }: CriteriaWithPagination<SignificantEventResponse>) => {
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
      {eventToMarkInactive ? (
        <MarkSignificantEventInactiveModal
          eventId={eventToMarkInactive}
          onClose={() => setEventToMarkInactive(undefined)}
        />
      ) : null}
    </>
  );
};
