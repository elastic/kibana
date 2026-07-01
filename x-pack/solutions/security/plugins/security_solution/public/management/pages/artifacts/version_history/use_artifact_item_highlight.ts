/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useSetUrlParams } from '../../../components/artifact_list_page/hooks/use_set_url_params';
import { useUrlParams } from '../../../hooks/use_url_params';
import type { ArtifactListPageUrlParams } from '../../../components/artifact_list_page';
import { useArtifactsVersionHistoryHighlight } from './artifacts_version_history_highlight_context';

const HIGHLIGHT_CLEAR_MS = 1000;
const SCROLL_RETRY_INTERVAL_MS = 150;
const SCROLL_RETRY_MAX_ATTEMPTS = 30;

export const useArtifactItemHighlight = ({
  isListReady,
}: {
  isListReady: boolean;
}): {
  activeHighlightItemId?: string;
  flashGeneration: number;
  isHighlighted: (itemId: string) => boolean;
} => {
  const setUrlParams = useSetUrlParams();
  const { flashingItemId, flashGeneration } = useArtifactsVersionHistoryHighlight();
  const {
    urlParams: { highlightItemId: highlightItemIdParam },
  } = useUrlParams<ArtifactListPageUrlParams>();
  const highlightItemId = Array.isArray(highlightItemIdParam)
    ? highlightItemIdParam[0]
    : highlightItemIdParam;
  const clearTimeoutRef = useRef<number>();
  const scrollIntervalRef = useRef<number>();

  const activeHighlightItemId = flashingItemId ?? highlightItemId;

  const isHighlighted = useCallback(
    (itemId: string) => activeHighlightItemId === itemId,
    [activeHighlightItemId]
  );

  useEffect(() => {
    if (!highlightItemId) {
      return;
    }

    clearTimeoutRef.current = window.setTimeout(() => {
      setUrlParams({ highlightItemId: undefined });
    }, HIGHLIGHT_CLEAR_MS);

    return () => {
      if (clearTimeoutRef.current) {
        window.clearTimeout(clearTimeoutRef.current);
      }
    };
  }, [highlightItemId, setUrlParams]);

  useEffect(() => {
    if (!activeHighlightItemId || !isListReady) {
      return;
    }

    let attempts = 0;

    const scrollToHighlightedItem = (): boolean => {
      const highlightedElement = document.querySelector(
        `[data-artifact-item-id="${activeHighlightItemId}"]`
      );

      if (highlightedElement) {
        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }

      return false;
    };

    if (scrollToHighlightedItem()) {
      return;
    }

    scrollIntervalRef.current = window.setInterval(() => {
      attempts += 1;

      if (scrollToHighlightedItem() || attempts >= SCROLL_RETRY_MAX_ATTEMPTS) {
        if (scrollIntervalRef.current) {
          window.clearInterval(scrollIntervalRef.current);
        }
      }
    }, SCROLL_RETRY_INTERVAL_MS);

    return () => {
      if (scrollIntervalRef.current) {
        window.clearInterval(scrollIntervalRef.current);
      }
    };
  }, [activeHighlightItemId, flashGeneration, isListReady]);

  return {
    activeHighlightItemId,
    flashGeneration,
    isHighlighted,
  };
};
