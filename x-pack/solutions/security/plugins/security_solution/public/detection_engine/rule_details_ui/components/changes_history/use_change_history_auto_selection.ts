/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';
import { DIFFABLE_CHANGE_ACTIONS } from '../changes_history_timeline/constants';

interface UseChangeHistoryAutoSelectionParams {
  ruleId: string;
  items: RuleHistoryItem[];
  setSelectedItem: (item: RuleHistoryItem | undefined) => void;
}

export function useChangeHistoryAutoSelection({
  ruleId,
  items,
  setSelectedItem,
}: UseChangeHistoryAutoSelectionParams): void {
  // Reset the selected item when ruleId changes
  useEffect(() => {
    console.log('reset selection');
    setSelectedItem(undefined);
  }, [ruleId]);

  // Auto-select first active item
  const lastAutoSelectedRuleRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (lastAutoSelectedRuleRef.current === ruleId) {
      return;
    }

    const firstActive = items.find((item) => DIFFABLE_CHANGE_ACTIONS.includes(item.action));
    if (!firstActive) {
      return;
    }

    lastAutoSelectedRuleRef.current = ruleId;
    setSelectedItem(firstActive);
  }, [items, ruleId]);
}
