/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sloFeatureId } from '@kbn/observability-plugin/common';
import { useKibana } from './use_kibana';
import { useFetchSloGlobalDiagnosis } from './use_fetch_global_diagnosis';

export function usePermissions() {
  const {
    application: { capabilities },
  } = useKibana().services;

  const { data: globalDiagnosis, isLoading } = useFetchSloGlobalDiagnosis();

  // @ts-expect-error upgrade typescript v5.9.3
  const hasRequiredReadCapabilities = !!capabilities[sloFeatureId].read ?? false;
  // @ts-expect-error upgrade typescript v5.9.3
  const hasRequiredWriteCapabilities = !!capabilities[sloFeatureId].write ?? false;

  const hasRequiredReadPrivileges =
    // @ts-expect-error upgrade typescript v5.9.3
    !!globalDiagnosis?.userPrivileges.read.has_all_requested ?? false;
  const hasRequiredWritePrivileges =
    // @ts-expect-error upgrade typescript v5.9.3
    !!globalDiagnosis?.userPrivileges.write.has_all_requested ?? false;

  return {
    isLoading,
    data: isLoading
      ? undefined
      : {
          capabilities: {
            read: hasRequiredReadCapabilities,
            write: hasRequiredWriteCapabilities,
          },
          privileges: {
            read: hasRequiredReadPrivileges,
            write: hasRequiredWritePrivileges,
          },
          hasAllReadRequested: hasRequiredReadCapabilities && hasRequiredReadPrivileges,
          hasAllWriteRequested: hasRequiredWriteCapabilities && hasRequiredWritePrivileges,
        },
  };
}
