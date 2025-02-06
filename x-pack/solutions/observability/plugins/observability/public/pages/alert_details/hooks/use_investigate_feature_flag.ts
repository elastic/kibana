/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useKibana } from '../../../utils/kibana_react';

const FEATURE_FLAG_NAME = 'observability.investigateEnabled';

export function useInvestigateFeatureFlag(): boolean {
  const { featureFlags } = useKibana().services;
  const [isInvestigateEnabled, setIsInvestigateEnabled] = useState<boolean>(false);

  useEffect(() => {
    const featureFlagSub = featureFlags
      .getBooleanValue$(FEATURE_FLAG_NAME, true)
      .subscribe(setIsInvestigateEnabled);
    return () => featureFlagSub.unsubscribe();
  }, [featureFlags]);

  return isInvestigateEnabled;
}
