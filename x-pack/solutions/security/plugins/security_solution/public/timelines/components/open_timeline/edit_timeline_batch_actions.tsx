/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTable } from '@elastic/eui';
import { EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { type TimelineType, TimelineTypeEnum } from '../../../../common/api/timeline';

import * as i18n from './translations';
import {
  SUPER_TIMELINE_TOO_FEW,
  SUPER_TIMELINE_TOO_MANY,
  SUPER_TIMELINE_UNSUPPORTED_QUERY_TYPES,
  ESQL_QUERY_TYPE_LABEL,
  EQL_QUERY_TYPE_LABEL,
} from '../super_timeline/translations';
import type { DeleteTimelines, OpenTimelineResult } from './types';
import { EditTimelineActions } from './export_timeline';
import { useEditTimelineActions } from './edit_timeline_actions';
import { getSelectedTimelineIdsAndSearchIds, getRequestIds } from '.';
import {
  MAX_SUPER_TIMELINE_COUNT,
  useOpenSuperTimeline,
} from '../super_timeline/use_open_super_timeline';
import { getUnmergeableSelections } from '../super_timeline/get_unmergeable_selections';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

export const useEditTimelineBatchActions = ({
  deleteTimelines,
  selectedItems,
  showExportAction = true,
  tableRef,
  timelineType = TimelineTypeEnum.default,
}: {
  deleteTimelines?: DeleteTimelines;
  selectedItems?: OpenTimelineResult[];
  showExportAction?: boolean;
  tableRef: React.MutableRefObject<EuiBasicTable<OpenTimelineResult> | null>;
  timelineType: TimelineType | null;
}) => {
  const {
    enableExportTimelineDownloader,
    disableExportTimelineDownloader,
    isEnableDownloader,
    isDeleteTimelineModalOpen,
    onOpenDeleteTimelineModal,
    onCloseDeleteTimelineModal,
  } = useEditTimelineActions();

  const { openSuperTimeline, isLoading: isSuperTimelineLoading } = useOpenSuperTimeline();
  const isSuperTimelineEnabled = useIsExperimentalFeatureEnabled('superTimeline');

  const onCompleteBatchActions = useCallback(
    (closePopover?: () => void) => {
      if (closePopover != null) closePopover();
      if (tableRef != null && tableRef.current != null) {
        tableRef.current.changeSelection([]);
      }
      disableExportTimelineDownloader();
      onCloseDeleteTimelineModal();
    },
    [disableExportTimelineDownloader, onCloseDeleteTimelineModal, tableRef]
  );

  const { timelineIds, searchIds } = useMemo(() => {
    if (selectedItems != null) {
      return getRequestIds(getSelectedTimelineIdsAndSearchIds(selectedItems));
    } else {
      return { timelineIds: [], searchIds: undefined };
    }
  }, [selectedItems]);

  const handleEnableExportTimelineDownloader = useCallback(
    () => enableExportTimelineDownloader(),
    [enableExportTimelineDownloader]
  );

  const handleOnOpenDeleteTimelineModal = useCallback(
    () => onOpenDeleteTimelineModal(),
    [onOpenDeleteTimelineModal]
  );

  const selectedSavedObjectIds = useMemo(
    () =>
      (selectedItems ?? [])
        .map((item) => item.savedObjectId)
        .filter((id): id is string => id != null),
    [selectedItems]
  );

  const unmergeableSelections = useMemo(
    () => getUnmergeableSelections(selectedItems ?? []),
    [selectedItems]
  );

  const isSuperTimelineActionEnabled = useMemo(
    () =>
      selectedSavedObjectIds.length >= 2 &&
      selectedSavedObjectIds.length <= MAX_SUPER_TIMELINE_COUNT &&
      unmergeableSelections.length === 0 &&
      !isSuperTimelineLoading,
    [selectedSavedObjectIds, unmergeableSelections, isSuperTimelineLoading]
  );

  const superTimelineTooltip = useMemo(() => {
    if (unmergeableSelections.length > 0) {
      const formattedTitles = unmergeableSelections
        .map(
          (s) =>
            `${s.title} (${s.reason === 'esql' ? ESQL_QUERY_TYPE_LABEL : EQL_QUERY_TYPE_LABEL})`
        )
        .join(', ');
      return SUPER_TIMELINE_UNSUPPORTED_QUERY_TYPES(formattedTitles);
    }
    if (selectedSavedObjectIds.length < 2) {
      return SUPER_TIMELINE_TOO_FEW;
    }
    if (selectedSavedObjectIds.length > MAX_SUPER_TIMELINE_COUNT) {
      return SUPER_TIMELINE_TOO_MANY(MAX_SUPER_TIMELINE_COUNT);
    }
    return undefined;
  }, [unmergeableSelections, selectedSavedObjectIds]);

  const handleOpenSuperTimeline = useCallback(
    (closePopover: () => void) => {
      closePopover();
      openSuperTimeline(selectedSavedObjectIds);
    },
    [openSuperTimeline, selectedSavedObjectIds]
  );

  const getBatchItemsPopoverContent = useCallback(
    (closePopover: () => void) => {
      const disabled = selectedItems == null || selectedItems.length === 0;
      const items = [];
      if (selectedItems && showExportAction) {
        items.push(
          <EuiContextMenuItem
            data-test-subj="export-timeline-action"
            disabled={disabled}
            icon="upload"
            key="ExportItemKey"
            onClick={handleEnableExportTimelineDownloader}
          >
            {i18n.EXPORT_SELECTED}
          </EuiContextMenuItem>
        );
      }
      if (isSuperTimelineEnabled && timelineType === TimelineTypeEnum.default) {
        items.push(
          <EuiContextMenuItem
            data-test-subj="view-super-timeline-action"
            disabled={!isSuperTimelineActionEnabled}
            icon="merge"
            key="SuperTimelineItemKey"
            onClick={
              isSuperTimelineActionEnabled ? () => handleOpenSuperTimeline(closePopover) : undefined
            }
            toolTipContent={superTimelineTooltip}
            toolTipProps={{ position: 'left' }}
          >
            {i18n.VIEW_SUPER_TIMELINE}
          </EuiContextMenuItem>
        );
      }
      if (deleteTimelines) {
        items.push(
          <EuiContextMenuItem
            data-test-subj="delete-timeline-action"
            disabled={disabled}
            icon="trash"
            key="DeleteItemKey"
            onClick={handleOnOpenDeleteTimelineModal}
          >
            {i18n.DELETE_SELECTED}
          </EuiContextMenuItem>
        );
      }
      return (
        <>
          <EditTimelineActions
            deleteTimelines={deleteTimelines}
            ids={timelineIds}
            savedSearchIds={searchIds}
            isEnableDownloader={isEnableDownloader}
            isDeleteTimelineModalOpen={isDeleteTimelineModalOpen}
            onComplete={onCompleteBatchActions.bind(null, closePopover)}
            title={
              selectedItems?.length !== 1
                ? timelineType === TimelineTypeEnum.template
                  ? i18n.SELECTED_TEMPLATES(selectedItems?.length ?? 0)
                  : i18n.SELECTED_TIMELINES(selectedItems?.length ?? 0)
                : selectedItems[0]?.title ?? ''
            }
          />
          <EuiContextMenuPanel items={items} />
        </>
      );
    },
    [
      selectedItems,
      showExportAction,
      deleteTimelines,
      timelineIds,
      searchIds,
      isEnableDownloader,
      isDeleteTimelineModalOpen,
      onCompleteBatchActions,
      timelineType,
      handleEnableExportTimelineDownloader,
      handleOnOpenDeleteTimelineModal,
      isSuperTimelineActionEnabled,
      isSuperTimelineEnabled,
      handleOpenSuperTimeline,
      superTimelineTooltip,
    ]
  );
  return { onCompleteBatchActions, getBatchItemsPopoverContent };
};
