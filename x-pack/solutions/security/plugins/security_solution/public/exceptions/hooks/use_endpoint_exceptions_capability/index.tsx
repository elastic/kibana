/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useIsExperimentalFeatureEnabled } from '@kbn/experimental-features';
import { useHasSecurityCapability } from '../../../helper_hooks';

export const useEndpointExceptionsCapability = (
  capability: 'showEndpointExceptions' | 'crudEndpointExceptions'
): boolean => {
  const isEndpointSpaceAwarenessEnabled = useIsExperimentalFeatureEnabled(
    'endpointManagementSpaceAwarenessEnabled'
  );
  const canWriteGlobalArtifacts = useHasSecurityCapability('writeGlobalArtifacts');
  const hasCapability = useHasSecurityCapability(capability);

  return useMemo(() => {
    if (!isEndpointSpaceAwarenessEnabled || capability === 'showEndpointExceptions') {
      return hasCapability;
    }

    return hasCapability && canWriteGlobalArtifacts;
  }, [canWriteGlobalArtifacts, capability, hasCapability, isEndpointSpaceAwarenessEnabled]);
};
