/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useCallback, useContext, useMemo, useState } from 'react';

interface ArtifactsVersionHistoryHighlightContextValue {
  flashingItemId?: string;
  flashGeneration: number;
  startFlashing: (itemId: string) => void;
}

const ArtifactsVersionHistoryHighlightContext =
  createContext<ArtifactsVersionHistoryHighlightContextValue | null>(null);

const FLASH_DURATION_MS = 1000;

export const ArtifactsVersionHistoryHighlightProvider = memo(
  function ArtifactsVersionHistoryHighlightProvider({
    children,
  }: {
    children: React.ReactNode;
  }): JSX.Element {
    const [flashingItemId, setFlashingItemId] = useState<string | undefined>();
    const [flashGeneration, setFlashGeneration] = useState(0);

    const startFlashing = useCallback((itemId: string) => {
      setFlashingItemId(itemId);
      setFlashGeneration((current) => current + 1);
      window.setTimeout(() => {
        setFlashingItemId((current) => (current === itemId ? undefined : current));
      }, FLASH_DURATION_MS);
    }, []);

    const value = useMemo(
      () => ({
        flashingItemId,
        flashGeneration,
        startFlashing,
      }),
      [flashGeneration, flashingItemId, startFlashing]
    );

    return (
      <ArtifactsVersionHistoryHighlightContext.Provider value={value}>
        {children}
      </ArtifactsVersionHistoryHighlightContext.Provider>
    );
  }
);

export const useArtifactsVersionHistoryHighlight =
  (): ArtifactsVersionHistoryHighlightContextValue => {
    const context = useContext(ArtifactsVersionHistoryHighlightContext);

    if (!context) {
      throw new Error(
        'useArtifactsVersionHistoryHighlight must be used within ArtifactsVersionHistoryHighlightProvider'
      );
    }

    return context;
  };
