/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useKibana } from '../../../../common/lib/kibana';
import type { AddToChatTourState, AddToChatTourStepNumber } from './constants';
import { ADD_TO_CHAT_TOUR_STORAGE_KEY, DEFAULT_ADD_TO_CHAT_TOUR_STATE } from './constants';

export interface UseAddToChatTourStateResult {
  tourState: AddToChatTourState;
  goToStep: (step: AddToChatTourStepNumber) => void;
  completeTour: () => void;
  /** Reported by the tour component so "Add to chat" clicks only end a tour the user can see. */
  setIsStepShowing: (isStepShowing: boolean) => void;
  /** Ends the tour if one of its steps is currently showing. */
  onAddToChat: () => void;
}

/** Persisted progress of the rule migrations "Add to chat" tour. */
export const useAddToChatTourState = (): UseAddToChatTourStateResult => {
  const {
    services: { storage },
  } = useKibana();

  const [tourState, setTourState] = useState<AddToChatTourState>(() => ({
    ...DEFAULT_ADD_TO_CHAT_TOUR_STATE,
    ...storage.get(ADD_TO_CHAT_TOUR_STORAGE_KEY),
  }));
  const [isStepShowing, setIsStepShowing] = useState(false);

  // Persist only on user-driven transitions, so a tour that never started leaves no trace.
  const saveTourState = useCallback(
    (nextTourState: AddToChatTourState) => {
      setTourState(nextTourState);
      storage.set(ADD_TO_CHAT_TOUR_STORAGE_KEY, nextTourState);
    },
    [storage]
  );

  const goToStep = useCallback(
    (currentTourStep: AddToChatTourStepNumber) => saveTourState({ ...tourState, currentTourStep }),
    [saveTourState, tourState]
  );

  const completeTour = useCallback(() => {
    if (tourState.isTourActive) {
      saveTourState({ ...tourState, isTourActive: false });
    }
  }, [saveTourState, tourState]);

  const onAddToChat = useCallback(() => {
    if (isStepShowing) {
      completeTour();
    }
  }, [completeTour, isStepShowing]);

  return { tourState, goToStep, completeTour, setIsStepShowing, onAddToChat };
};
