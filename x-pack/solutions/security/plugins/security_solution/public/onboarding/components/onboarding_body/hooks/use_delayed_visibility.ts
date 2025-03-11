/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { HEIGHT_ANIMATION_DURATION } from '../onboarding_card_panel.styles';

/**
 * This hook manages a delayed visibility state (`isVisible`) to support smooth animations
 * during expand and collapse transitions. It delays the `isVisible` state change when
 * collapsing, allowing animations to complete before unmounting the component.
 *
 * @param {Object} params - Parameters object.
 * @param {boolean} params.isExpanded - Controls whether the component should be expanded
 * (fully visible) or collapsed (delayed unmount).
 *
 * @returns {boolean} isVisible - True if the component should be visible, false otherwise.
 */
export const useDelayedVisibility = ({ isExpanded }: { isExpanded?: boolean }) => {
  const [isVisible, setIsVisible] = useState(isExpanded);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Delay visibility toggle off to allow exit animations to complete
    if (!isExpanded) {
      timeoutId = setTimeout(() => setIsVisible(false), HEIGHT_ANIMATION_DURATION);
    } else {
      setIsVisible(true);
    }

    return () => clearTimeout(timeoutId);
  }, [isExpanded]);

  return isVisible;
};
