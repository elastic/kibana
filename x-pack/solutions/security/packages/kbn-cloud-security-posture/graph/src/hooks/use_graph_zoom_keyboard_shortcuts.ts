/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import {
  isCenterKey,
  isEditableKeyboardTarget,
  isFitToScreenKey,
  isFullScreenKey,
  isZoomInKey,
  isZoomOutKey,
} from '../components/controls/graph_keyboard_shortcuts';

interface UseGraphZoomKeyboardShortcutsArgs {
  enabled?: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onToggleFullScreen?: () => void;
  onCenter?: () => void;
}

export const useGraphZoomKeyboardShortcuts = ({
  enabled = true,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onToggleFullScreen,
  onCenter,
}: UseGraphZoomKeyboardShortcutsArgs): void => {
  const onZoomInRef = useRef(onZoomIn);
  const onZoomOutRef = useRef(onZoomOut);
  const onFitToScreenRef = useRef(onFitToScreen);
  const onToggleFullScreenRef = useRef(onToggleFullScreen);
  const onCenterRef = useRef(onCenter);

  onZoomInRef.current = onZoomIn;
  onZoomOutRef.current = onZoomOut;
  onFitToScreenRef.current = onFitToScreen;
  onToggleFullScreenRef.current = onToggleFullScreen;
  onCenterRef.current = onCenter;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(event.target)) {
        return;
      }

      if (isZoomInKey(event)) {
        event.preventDefault();
        onZoomInRef.current();
        return;
      }

      if (isZoomOutKey(event)) {
        event.preventDefault();
        onZoomOutRef.current();
        return;
      }

      if (isFitToScreenKey(event)) {
        event.preventDefault();
        onFitToScreenRef.current();
        return;
      }

      if (isFullScreenKey(event) && onToggleFullScreenRef.current) {
        event.preventDefault();
        onToggleFullScreenRef.current();
        return;
      }

      if (isCenterKey(event) && onCenterRef.current) {
        event.preventDefault();
        onCenterRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled]);
};
