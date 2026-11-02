/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CommonAttachmentListViewProps } from '@kbn/cases-plugin/public';
import type { TimelineNonEcsData } from '../../../../../common/search_strategy';

interface UseEventsSelectionArgs {
  /** Ids of the events shown on the current page. */
  pageIds: string[];
  onRemove?: CommonAttachmentListViewProps['onRemove'];
}

interface UseEventsSelection {
  selectedIds: ReadonlySet<string>;
  /** The selected ids in the shape the row checkboxes read. */
  selectedEventIds: Record<string, TimelineNonEcsData[]>;
  isPageSelected: boolean;
  onRowSelected: (args: { eventIds: string[]; isSelected: boolean }) => void;
  onSelectPage: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveSelected: () => void;
  /** Removes 1 event from the case. Unset when the user can't remove. */
  onRemoveEvent?: (eventId: string) => void;
}

/** Row selection for the case events table, used to remove events from the case. */
export const useEventsSelection = ({
  pageIds,
  onRemove,
}: UseEventsSelectionArgs): UseEventsSelection => {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());

  // Keeps only rows on the current page, so a page change or a removal unchecks hidden rows.
  useEffect(() => {
    setSelectedIds((previous) => {
      const next = new Set([...previous].filter((id) => pageIds.includes(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [pageIds]);

  const selectedEventIds = useMemo(
    () =>
      Object.fromEntries([...selectedIds].map((id): [string, TimelineNonEcsData[]] => [id, []])),
    [selectedIds]
  );

  const onRowSelected = useCallback(
    ({ eventIds, isSelected }: { eventIds: string[]; isSelected: boolean }) =>
      setSelectedIds((previous) => {
        const next = new Set(previous);
        eventIds.forEach((id) => (isSelected ? next.add(id) : next.delete(id)));
        return next;
      }),
    []
  );

  const isPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const onSelectPage = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setSelectedIds(event.target.checked ? new Set(pageIds) : new Set()),
    [pageIds]
  );

  const onRemoveSelected = useCallback(
    () =>
      onRemove?.(
        { attachmentIds: [...selectedIds] },
        { onSuccess: () => setSelectedIds(new Set()) }
      ),
    [onRemove, selectedIds]
  );

  const onRemoveEvent = useMemo(
    () =>
      onRemove != null ? (eventId: string) => onRemove({ attachmentIds: [eventId] }) : undefined,
    [onRemove]
  );

  return {
    selectedIds,
    selectedEventIds,
    isPageSelected,
    onRowSelected,
    onSelectPage,
    onRemoveSelected,
    onRemoveEvent,
  };
};
