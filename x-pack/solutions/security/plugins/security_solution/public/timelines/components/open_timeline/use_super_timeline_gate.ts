/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { SUPER_TIMELINE_TOO_FEW, SUPER_TIMELINE_TOO_MANY } from '../super_timeline/translations';
import type { OpenTimelineResult } from './types';
import {
  MAX_SUPER_TIMELINE_COUNT,
  useOpenSuperTimeline,
} from '../super_timeline/use_open_super_timeline';

/**
 * Computes enabled state, tooltip, and open handler for the "View Super Timeline"
 * batch action. Extracted from useEditTimelineBatchActions so the gate logic can be
 * tested independently without rendering popover JSX.
 *
 * Any timeline type (KQL, EQL, ES|QL) may be selected. EQL and ES|QL queries are
 * disregarded at merge time; only each timeline's Query-tab state is merged.
 */
export const useSuperTimelineGate = ({
  selectedItems,
}: {
  selectedItems?: OpenTimelineResult[];
}) => {
  const { openSuperTimeline, isLoading } = useOpenSuperTimeline();

  const selectedSavedObjectIds = useMemo(
    () =>
      (selectedItems ?? [])
        .map((item) => item.savedObjectId)
        .filter((id): id is string => id != null),
    [selectedItems]
  );

  const isEnabled = useMemo(
    () =>
      selectedSavedObjectIds.length >= 2 &&
      selectedSavedObjectIds.length <= MAX_SUPER_TIMELINE_COUNT &&
      !isLoading,
    [selectedSavedObjectIds, isLoading]
  );

  const tooltip = useMemo(() => {
    if (selectedSavedObjectIds.length < 2) {
      return SUPER_TIMELINE_TOO_FEW;
    }
    if (selectedSavedObjectIds.length > MAX_SUPER_TIMELINE_COUNT) {
      return SUPER_TIMELINE_TOO_MANY(MAX_SUPER_TIMELINE_COUNT);
    }
    return undefined;
  }, [selectedSavedObjectIds]);

  const handleOpen = useCallback(
    (closePopover: () => void) => {
      closePopover();
      openSuperTimeline(selectedSavedObjectIds);
    },
    [openSuperTimeline, selectedSavedObjectIds]
  );

  return { isEnabled, tooltip, handleOpen };
};
