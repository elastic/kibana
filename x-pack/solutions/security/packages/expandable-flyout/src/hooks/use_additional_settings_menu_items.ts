/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useExpandableFlyoutState } from '../..';
import { Panel } from '../types';

export interface UseAdditionalSettingsMenuItemsParams {
  /**
   * List of all registered panels available for render
   */
  registeredPanels: Panel[];
}

export interface UseAdditionalSettingsMenuItemsResult {
  /**
   * Additional items passed to the flyout to be displayed in the settings menu
   */
  additionalSettingsMenuItems: Panel['additionalSettingsMenuItems'];
}

/**
 * Hook that retrieves the optional additional items to be displayed in the settings menu
 */
export const useAdditionalSettingsMenuItems = ({
  registeredPanels,
}: UseAdditionalSettingsMenuItemsParams): UseAdditionalSettingsMenuItemsResult => {
  const { right } = useExpandableFlyoutState();

  const additionalSettingsMenuItems = useMemo(
    () => registeredPanels.find((panel) => panel.key === right?.id)?.additionalSettingsMenuItems,
    [registeredPanels, right]
  );

  return useMemo(
    () => ({
      additionalSettingsMenuItems,
    }),
    [additionalSettingsMenuItems]
  );
};
