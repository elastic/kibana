/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';
import { DIFFABLE_CHANGE_ACTIONS } from '../changes_history_timeline/constants';

interface UseChangeHistoryAutoSelectionParams {
  ruleId: string;
  items: RuleHistoryItem[];
  selectedItem: RuleHistoryItem | undefined;
  setSelectedItem: (item: RuleHistoryItem | undefined) => void;
  loadMore: () => void;
}

export function useChangeHistoryAutoSelection({
  ruleId,
  items,
  selectedItem,
  setSelectedItem,
  loadMore,
}: UseChangeHistoryAutoSelectionParams): void {
  // Reset the selected item when ruleId changes
  useEffect(() => {
    setSelectedItem(undefined);
  }, [ruleId, setSelectedItem]);

  // Auto-select the first active item. Track the id we last auto-selected so we
  // can tell an auto-selection apart from a manual one: loading older pages keeps
  // the current selection, a newly recorded change at the top advances the
  // selection, but a selection the user picked themselves is always preserved.
  const lastAutoSelectedIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const firstActive = items.find((item) => DIFFABLE_CHANGE_ACTIONS.includes(item.action));
    if (!firstActive) {
      // The first active item may live on a later page (e.g. the first page only
      // holds non-diffable events). Keep pulling pages until one shows up; the
      // call is a no-op when there are no more pages or one is already loading.
      loadMore();
      return;
    }

    if (lastAutoSelectedIdRef.current === firstActive.id) {
      return;
    }

    // Only advance when there is no selection, or the current selection is the
    // one we auto-selected previously. A manual selection is left untouched.
    const isManualSelection =
      selectedItem !== undefined && selectedItem.id !== lastAutoSelectedIdRef.current;
    if (isManualSelection) {
      return;
    }

    lastAutoSelectedIdRef.current = firstActive.id;
    setSelectedItem(firstActive);
  }, [items, selectedItem, setSelectedItem, loadMore]);
}
