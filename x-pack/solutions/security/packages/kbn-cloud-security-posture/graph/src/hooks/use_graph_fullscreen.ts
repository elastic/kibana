/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, type RefObject } from 'react';

export interface UseGraphFullscreenResult {
  isFullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
}

export const useGraphFullscreen = (
  targetRef: RefObject<HTMLElement | null>
): UseGraphFullscreenResult => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === targetRef.current);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [targetRef]);

  const toggleFullscreen = useCallback(async () => {
    const target = targetRef.current;

    if (!target) {
      return;
    }

    try {
      if (document.fullscreenElement === target) {
        await document.exitFullscreen();
      } else {
        await target.requestFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by the browser or user settings.
    }
  }, [targetRef]);

  return { isFullscreen, toggleFullscreen };
};
