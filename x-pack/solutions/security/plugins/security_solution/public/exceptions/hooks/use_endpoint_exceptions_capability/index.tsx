/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useGetEndpointExceptionsPerPolicyOptIn } from '../../../management/hooks/artifacts/use_endpoint_per_policy_opt_in';
import { useHasSecurityCapability } from '../../../helper_hooks';

/**
 * Determine if user has capability to view or crud Endpoint Exceptions, taking into account both global artifact permissions and per-policy opt-in status.
 *
 * Before per-policy EE opt-in, user needs both Endpoint Exceptions ALL and Global Artifact Management ALL to CRUD.
 *
 * After per-policy EE opt-in, user needs only Endpoint Exceptions ALL to CRUD, as the exceptions can be created as per-policy.
 *
 * @param capability 'showEndpointExceptions' | 'crudEndpointExceptions'
 */
export const useEndpointExceptionsCapability = (
  capability: 'showEndpointExceptions' | 'crudEndpointExceptions'
): boolean => {
  const { data: isPerPolicyOptIn } = useGetEndpointExceptionsPerPolicyOptIn({
    enabled: capability === 'crudEndpointExceptions',
  });
  const canWriteGlobalArtifacts = useHasSecurityCapability('writeGlobalArtifacts');
  const hasCapability = useHasSecurityCapability(capability);

  return useMemo(() => {
    if (capability === 'showEndpointExceptions') {
      return hasCapability;
    }

    const areEndpointExceptionsPerPolicy = isPerPolicyOptIn?.status === true;

    return hasCapability && (canWriteGlobalArtifacts || areEndpointExceptionsPerPolicy);
  }, [canWriteGlobalArtifacts, capability, hasCapability, isPerPolicyOptIn]);
};
