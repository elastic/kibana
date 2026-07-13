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
 * The `newFlyoutSystemEnabled` experimental feature flag controls whether the
 * "Enable new flyout" advanced setting is registered:
 * - when the flag is on, the setting is registered and users can opt in
 *   (it defaults to `false`, so the new flyout is used only once the user turns it on);
 * - when the flag is off (the default), the setting is not registered and the new flyout is
 *   always disabled — regardless of any value the user may have previously stored for it.
 */
export const useIsNewFlyoutEnabled = (): boolean => {
  const { uiSettings } = useKibana().services;
  const isNewFlyoutSystemEnabled = useIsExperimentalFeatureEnabled('newFlyoutSystemEnabled');

  // The feature flag gates registration of the advanced setting: when it's off, the setting isn't
  // registered, so fall back to the legacy flyout regardless of any stale stored value.
  if (!isNewFlyoutSystemEnabled) {
    return false;
  }

  return uiSettings.get<boolean>(ENABLE_NEW_FLYOUT_SETTING, false);
};
