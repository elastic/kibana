/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  ATTACK_DISCOVERY_STORAGE_KEY,
  DEFAULT_ASSISTANT_NAMESPACE,
  MOVING_ATTACKS_CALLOUT_LOCAL_STORAGE_KEY,
} from '@kbn/elastic-assistant';

/**
 * Hook to manage the visibility of the moving attacks callout
 */
export const useMovingAttacksCallout = () => {
  const [isMovingAttacksCalloutVisible, setMovingAttacksCalloutVisible] = useLocalStorage<boolean>(
    `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${MOVING_ATTACKS_CALLOUT_LOCAL_STORAGE_KEY}`,
    true
  );

  const hideMovingAttacksCallout = () => setMovingAttacksCalloutVisible(false);

  const showMovingAttacksCallout = () => setMovingAttacksCalloutVisible(true);

  return {
    isMovingAttacksCalloutVisible,
    hideMovingAttacksCallout,
    showMovingAttacksCallout,
  };
};
