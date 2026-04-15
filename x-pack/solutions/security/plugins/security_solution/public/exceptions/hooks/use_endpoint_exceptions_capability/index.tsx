/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useGetEndpointExceptionsPerPolicyOptIn } from '../../../management/hooks/artifacts/use_endpoint_per_policy_opt_in';
import { useHasSecurityCapability } from '../../../helper_hooks';

export const useEndpointExceptionsCapability = (
  capability: 'showEndpointExceptions' | 'crudEndpointExceptions'
): boolean => {
  const { data: isPerPolicyOptIn } = useGetEndpointExceptionsPerPolicyOptIn(); // todo: do not call on read
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
