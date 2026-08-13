/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import {
  SUPER_TIMELINE_TOO_FEW,
  SUPER_TIMELINE_TOO_MANY,
  SUPER_TIMELINE_UNSUPPORTED_QUERY_TYPES,
  ESQL_QUERY_TYPE_LABEL,
  EQL_QUERY_TYPE_LABEL,
} from '../super_timeline/translations';
import type { OpenTimelineResult } from './types';
import {
  MAX_SUPER_TIMELINE_COUNT,
  useOpenSuperTimeline,
} from '../super_timeline/use_open_super_timeline';
import { getUnmergeableSelections } from '../super_timeline/get_unmergeable_selections';

/**
 * Computes enabled state, tooltip, and open handler for the "View Super Timeline"
 * batch action. Extracted from useEditTimelineBatchActions so the gate logic can be
 * tested independently without rendering popover JSX.
 */
export const useSuperTimelineGate = ({
  selectedItems,
  searchResults,
}: {
  selectedItems?: OpenTimelineResult[];
  searchResults?: OpenTimelineResult[] | null;
}) => {
  const { openSuperTimeline, isLoading } = useOpenSuperTimeline();

  const selectedSavedObjectIds = useMemo(
    () =>
      (selectedItems ?? [])
        .map((item) => item.savedObjectId)
        .filter((id): id is string => id != null),
    [selectedItems]
  );

  const unmergeableSelections = useMemo(() => {
    const items = selectedItems ?? [];
    if (!searchResults || searchResults.length === 0) {
      return getUnmergeableSelections(items);
    }
    const byId = new Map(searchResults.map((r) => [r.savedObjectId, r]));
    const freshItems = items.map((item) => byId.get(item.savedObjectId ?? '') ?? item);
    return getUnmergeableSelections(freshItems);
  }, [selectedItems, searchResults]);

  const isEnabled = useMemo(
    () =>
      selectedSavedObjectIds.length >= 2 &&
      selectedSavedObjectIds.length <= MAX_SUPER_TIMELINE_COUNT &&
      unmergeableSelections.length === 0 &&
      !isLoading,
    [selectedSavedObjectIds, unmergeableSelections, isLoading]
  );

  const tooltip = useMemo(() => {
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

  const handleOpen = useCallback(
    (closePopover: () => void) => {
      closePopover();
      openSuperTimeline(selectedSavedObjectIds);
    },
    [openSuperTimeline, selectedSavedObjectIds]
  );

  return { isEnabled, tooltip, handleOpen };
};
