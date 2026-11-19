/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SourceGenerationResult } from '../../hooks/use_source_generation';
import type { AnalyticsSourceGeneration, AnalyticsStarterQuery } from '../../types';

type GenerationWithQueries = AnalyticsSourceGeneration & {
  queries: readonly AnalyticsStarterQuery[];
};

const hasQueries = (
  generation: AnalyticsSourceGeneration | undefined
): generation is GenerationWithQueries => generation !== undefined && generation.queries !== null;

export interface StarterQueryUpgrade {
  /** The generated answer whose questions are on screen; undefined while the built-in ones are. */
  shown: GenerationWithQueries | undefined;
  /** Generated questions are ready but were held back, because the user is reading the current ones. */
  isOffered: boolean;
  /** Puts the generated questions that are ready on screen. */
  show: () => void;
  /** Asks for new questions, which go on screen as soon as they arrive. */
  regenerate: () => void;
  /** To call when the user expands or opens a question. */
  onInteract: () => void;
  /** To call when the pointer or the focus enters or leaves the list of questions. */
  onPresenceChange: (isInside: boolean) => void;
}

/**
 * Decides when generated questions take the place of the built-in ones. They do so on arrival only
 * while the user has left the list alone: once a question has been expanded or opened, or while the
 * pointer or the focus is in the list, they are offered instead and wait for the user to ask.
 * Questions the user asked for (show, regenerate) always go on screen.
 */
export const useStarterQueryUpgrade = (
  sourceName: string | undefined,
  generation: SourceGenerationResult
): StarterQueryUpgrade => {
  const [shown, setShown] = useState<GenerationWithQueries>();
  const hasInteracted = useRef(false);
  const isInside = useRef(false);
  const wasRequested = useRef(false);

  useEffect(() => {
    hasInteracted.current = false;
    wasRequested.current = false;
  }, [sourceName]);

  const ready =
    hasQueries(generation.data) && generation.data.source === sourceName
      ? generation.data
      : undefined;
  const shownForSource = shown?.source === sourceName ? shown : undefined;
  const isOffered = ready !== undefined && shownForSource?.generatedAt !== ready.generatedAt;

  useEffect(() => {
    if (!isOffered || ready === undefined) {
      return;
    }
    if (wasRequested.current || (!hasInteracted.current && !isInside.current)) {
      wasRequested.current = false;
      setShown(ready);
    }
  }, [isOffered, ready]);

  const { regenerate: requestRegeneration } = generation;

  return {
    shown: shownForSource,
    isOffered,
    show: useCallback(() => {
      if (ready !== undefined) {
        setShown(ready);
      }
    }, [ready]),
    regenerate: useCallback(() => {
      wasRequested.current = true;
      requestRegeneration();
    }, [requestRegeneration]),
    onInteract: useCallback(() => {
      hasInteracted.current = true;
    }, []),
    onPresenceChange: useCallback((inside: boolean) => {
      isInside.current = inside;
    }, []),
  };
};
