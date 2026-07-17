/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_NEW_FLYOUT_SETTING } from '../../../common/constants';
import { useKibana } from '../lib/kibana';
import { useIsExperimentalFeatureEnabled } from './use_experimental_features';

/**
 * Returns whether the new (EUI-based) flyout system should be used.
 *
 * The `newFlyoutSystemDisabled` experimental feature flag controls whether the
 * "Enable new flyout" advanced setting is registered:
 * - when the flag is off (the default), the setting is registered and defaults to `false`, so the
 *   new flyout is disabled unless the user explicitly opts in;
 * - when the flag is on, the setting is unregistered and the new flyout is always disabled —
 *   regardless of any value the user may have previously stored for it.
 */
export const useIsNewFlyoutEnabled = (): boolean => {
  const { uiSettings } = useKibana().services;
  const isNewFlyoutSystemDisabled = useIsExperimentalFeatureEnabled('newFlyoutSystemDisabled');

  // The feature flag takes precedence: when it disables the new flyout system, the advanced setting
  // is unregistered, so always fall back to the legacy flyout.
  if (isNewFlyoutSystemDisabled) {
    return false;
  }

  // The advanced setting is registered (and defaults to `false`) whenever the flag is off, so it is
  // the source of truth for whether the user has opted in to the new flyout.
  return uiSettings.get<boolean>(ENABLE_NEW_FLYOUT_SETTING, false);
};
