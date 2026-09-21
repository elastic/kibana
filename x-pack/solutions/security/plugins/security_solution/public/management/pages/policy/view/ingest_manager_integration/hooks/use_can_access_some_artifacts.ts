/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { useIsExperimentalFeatureEnabled } from '../../../../../../common/hooks/use_experimental_features';

/**
 * Checks to see if the current user can access at least one artifact page.
 * Note that this hook will return `false` if the Authz is still being loaded.
 */
export const useCanAccessSomeArtifacts = (): boolean => {
  const {
    canReadBlocklist,
    canReadEventFilters,
    canReadTrustedApplications,
    canReadHostIsolationExceptions,
    canReadCustomYaraSignatures,
  } = useUserPrivileges().endpointPrivileges;
  const customYaraSignaturesEnabled = useIsExperimentalFeatureEnabled(
    'customYaraSignaturesEnabled'
  );

  return useMemo(() => {
    return (
      canReadBlocklist ||
      canReadEventFilters ||
      canReadTrustedApplications ||
      canReadHostIsolationExceptions ||
      (customYaraSignaturesEnabled && canReadCustomYaraSignatures)
    );
  }, [
    canReadBlocklist,
    canReadEventFilters,
    canReadTrustedApplications,
    canReadHostIsolationExceptions,
    customYaraSignaturesEnabled,
    canReadCustomYaraSignatures,
  ]);
};
