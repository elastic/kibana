/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING } from '../../../common/constants';
import { useKibana } from '../lib/kibana';
import { useIsExperimentalFeatureEnabled } from './use_experimental_features';

export const useIsAlertsAndAttacksAlignmentEnabled = () => {
  const { uiSettings } = useKibana().services;
  const isAlertsAndAttacksAlignmentEnabled = useIsExperimentalFeatureEnabled(
    'enableAlertsAndAttacksAlignment'
  );

  // In environments where the experimental feature is disabled (e.g., EASE/search_ai_lake),
  // the UI setting is not registered. For unregistered keys, `uiSettings.get` returns the
  // provided default value. By using the experimental feature flag as the default value,
  // we ensure that the setting correctly resolves to `false` in these environments.
  return uiSettings.get(
    ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING,
    isAlertsAndAttacksAlignmentEnabled
  );
};
