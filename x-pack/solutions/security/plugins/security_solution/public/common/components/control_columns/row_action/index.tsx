/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { TableId } from '@kbn/securitysolution-data-table';
import {
  casesCellActionRenderer,
  cellActionRenderer,
} from '../../../../flyout_v2/shared/components/cell_actions';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { LeftPanelNotesTab } from '../../../../flyout/document_details/left';
import { useKibana } from '../../../lib/kibana';
import { useIsNewFlyoutEnabled } from '../../../hooks/use_is_new_flyout_enabled';
import {
  DocumentDetailsLeftPanelKey,
  DocumentDetailsRightPanelKey,
} from '../../../../flyout/document_details/shared/constants/panel_keys';
import type {
  ControlColumnProps,
  SetEventsDeleted,
  SetEventsLoading,
} from '../../../../../common/types';
import type { TimelineItem, TimelineNonEcsData } from '../../../../../common/search_strategy';
import { type ColumnHeaderOptions, type OnRowSelected } from '../../../../../common/types/timeline';
import { DocumentEventTypes, FLYOUT_ORIGIN, NotesEventTypes } from '../../../lib/telemetry';
import { getMappedNonEcsValue } from '../../../utils/get_mapped_non_ecs_value';
import { useUserPrivileges } from '../../user_privileges';
import { getDocumentHistoryTitle } from '../../../../flyout_v2/document/main/utils/get_header_title';

export type RowActionProps = EuiDataGridCellValueElementProps & {
  columnHeaders: ColumnHeaderOptions[];
  controlColumn: ControlColumnProps;
  data: TimelineItem;
  disabled: boolean;
  esHitRecord?: EsHitRecord;
  index: number;
  isEventViewer: boolean;
  loadingEventIds: Readonly<string[]>;
  onRowSelected: OnRowSelected;
  onRuleChange?: () => void;
  pageRowIndex: number;
  refetch?: () => void;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  setEventsDeleted: SetEventsDeleted;
  setEventsLoading: SetEventsLoading;
  showCheckboxes: boolean;
  tabType?: string;
  tableId: string;
  width: number;
};

const RowActionComponent = ({
  columnHeaders,
  controlColumn,
  data,
  disabled,
  esHitRecord,
  index,
  isEventViewer,
  loadingEventIds,
  onRowSelected,
  onRuleChange,
  pageRowIndex,
  refetch,
  rowIndex,
  selectedEventIds,
  setEventsLoading,
  setEventsDeleted,
  showCheckboxes,
  tabType,
  tableId,
  width,
}: RowActionProps) => {
  const { data: timelineNonEcsData, ecs: ecsData, _id: eventId, _index: indexName } = data ?? {};
  const hit: DataTableRecord | undefined = useMemo(
    () => esHitRecord && buildDataTableRecord(esHitRecord),
    [esHitRecord]
  );

  const { telemetry } = useKibana().services;

  const { openFlyout } = useExpandableFlyoutApi();
  const enableNewFlyout = useIsNewFlyoutEnabled();
  const { openDocumentFlyoutFromIndex, openNotes } = useFlyoutApi();

  const columnValues = useMemo(
    () =>
      timelineNonEcsData &&
      columnHeaders
        .map(
          (header) =>
            getMappedNonEcsValue({
              data: timelineNonEcsData,
              fieldName: header.id,
            }) ?? []
        )
        .join(' '),
    [columnHeaders, timelineNonEcsData]
  );

  const {
    notesPrivileges: { read: canReadNotes },
    timelinePrivileges: { read: canReadTimelines },
  } = useUserPrivileges();
  const showNotes = canReadNotes;

  const handleAlertUpdated = useCallback(() => {
    refetch?.();
  }, [refetch]);

  const handleOnEventDetailPanelOpened = useCallback(() => {
    if (enableNewFlyout && hit) {
      openDocumentFlyoutFromIndex({
        documentId: eventId,
        indexName: indexName ?? undefined,
        renderCellActions:
          tableId === TableId.alertsOnCasePage ? casesCellActionRenderer : cellActionRenderer,
        onAlertUpdated: handleAlertUpdated,
        origin: FLYOUT_ORIGIN.ALERTS_TABLE,
        title: getDocumentHistoryTitle(hit),
      });
    } else {
      openFlyout({
        right: {
          id: DocumentDetailsRightPanelKey,
          params: {
            id: eventId,
            indexName,
            scopeId: tableId,
          },
        },
      });
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
        location: tableId,
        panel: 'right',
      });
    }
  }, [
    enableNewFlyout,
    hit,
    openDocumentFlyoutFromIndex,
    eventId,
    indexName,
    handleAlertUpdated,
    openFlyout,
    tableId,
    telemetry,
  ]);

  const toggleShowNotes = useCallback(() => {
    if (enableNewFlyout && hit) {
      openNotes({ hit, origin: FLYOUT_ORIGIN.ALERTS_TABLE });
    } else {
      openFlyout({
        right: {
          id: DocumentDetailsRightPanelKey,
          params: {
            id: eventId,
            indexName,
            scopeId: tableId,
          },
        },
        left: {
          id: DocumentDetailsLeftPanelKey,
          path: {
            tab: LeftPanelNotesTab,
          },
          params: {
            id: eventId,
            indexName,
            scopeId: tableId,
          },
        },
      });
    }
    telemetry.reportEvent(NotesEventTypes.OpenNoteInExpandableFlyoutClicked, {
      location: tableId,
    });
    telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
      location: tableId,
      panel: 'left',
    });
  }, [enableNewFlyout, hit, openNotes, openFlyout, eventId, indexName, tableId, telemetry]);

  const Action = controlColumn.rowCellRender;

  if (!timelineNonEcsData || !ecsData || !eventId) {
    return <span data-test-subj="noData" />;
  }

  return (
    <>
      {Action && (
        <Action
          ariaRowindex={pageRowIndex + 1}
          checked={Object.keys(selectedEventIds).includes(eventId)}
          columnId={controlColumn.id || ''}
          columnValues={columnValues || ''}
          data-test-subj="actions"
          disabled={disabled}
          disableTimelineAction={!canReadTimelines}
          ecsData={ecsData}
          eventId={eventId}
          hit={hit}
          index={index}
          isEventViewer={isEventViewer}
          loadingEventIds={loadingEventIds}
          onEventDetailsPanelOpened={handleOnEventDetailPanelOpened}
          onRowSelected={onRowSelected}
          onRuleChange={onRuleChange}
          refetch={refetch}
          rowIndex={rowIndex}
          setEventsLoading={setEventsLoading}
          setEventsDeleted={setEventsDeleted}
          showCheckboxes={showCheckboxes}
          showNotes={showNotes}
          tabType={tabType}
          timelineId={tableId}
          toggleShowNotes={toggleShowNotes}
          width={width}
        />
      )}
    </>
  );
};

export const RowAction = React.memo(RowActionComponent);
