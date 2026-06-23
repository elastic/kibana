/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import {
  hasModifierKeys,
  isEditableKeyboardTarget,
} from '../components/controls/graph_keyboard_shortcuts';

interface UseGraphInteractionKeyboardShortcutsArgs {
  enabled?: boolean;
  onSelectTool: () => void;
  onPanTool: () => void;
  onToggleApplyFiltersPanel: () => void;
}

export const useGraphInteractionKeyboardShortcuts = ({
  enabled = true,
  onSelectTool,
  onPanTool,
  onToggleApplyFiltersPanel,
}: UseGraphInteractionKeyboardShortcutsArgs): void => {
  const onSelectToolRef = useRef(onSelectTool);
  const onPanToolRef = useRef(onPanTool);
  const onToggleApplyFiltersPanelRef = useRef(onToggleApplyFiltersPanel);

  onSelectToolRef.current = onSelectTool;
  onPanToolRef.current = onPanTool;
  onToggleApplyFiltersPanelRef.current = onToggleApplyFiltersPanel;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(event.target)) {
        return;
      }

      if (event.code === 'KeyV' && !hasModifierKeys(event)) {
        event.preventDefault();
        onSelectToolRef.current();
        return;
      }

      if ((event.code === 'Space' || event.key === ' ') && !hasModifierKeys(event)) {
        event.preventDefault();
        onPanToolRef.current();
        return;
      }

      if (event.code === 'KeyD' && !hasModifierKeys(event)) {
        event.preventDefault();
        onToggleApplyFiltersPanelRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled]);
};
