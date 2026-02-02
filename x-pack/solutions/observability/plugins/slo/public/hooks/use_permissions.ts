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

  const hasRequiredReadCapabilities = !!capabilities[sloFeatureId].read;
  const hasRequiredWriteCapabilities = !!capabilities[sloFeatureId].write;

  const hasRequiredReadPrivileges = !!globalDiagnosis?.userPrivileges.read.has_all_requested;
  const hasRequiredWritePrivileges = !!globalDiagnosis?.userPrivileges.write.has_all_requested;

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
