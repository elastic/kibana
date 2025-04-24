/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_ALERTS_ENABLED_FEATURE_FLAG } from '@kbn/elastic-assistant-common';
import { useMemo } from 'react';
import { useKibana } from '../../../common/lib/kibana';

interface UseKibanaFeatureFlags {
  attackDiscoveryAlertsEnabled: boolean;
}

export const useKibanaFeatureFlags = (): UseKibanaFeatureFlags => {
  const {
    services: { featureFlags },
  } = useKibana();

  const attackDiscoveryAlertsEnabled = useMemo(
    () => featureFlags.getBooleanValue(ATTACK_DISCOVERY_ALERTS_ENABLED_FEATURE_FLAG, false),
    [featureFlags]
  );

  return {
    attackDiscoveryAlertsEnabled,
  };
};
