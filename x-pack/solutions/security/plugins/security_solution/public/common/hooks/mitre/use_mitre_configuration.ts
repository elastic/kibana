/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_MITRE_FRAMEWORK } from '@kbn/security-mitre-attack-common';
import type {
  MitreEntitySummaryBuckets,
  MitreEntitySummaryCollection,
  GetMitreEntitiesRequestParams,
} from '@kbn/security-mitre-attack-common';
import { useFetchMitreEntitiesQuery } from '@kbn/mitre-attack-plugin/public';
import { useKibana } from '../../lib/kibana';
import { useFetchLegacyMitreQuery } from './use_fetch_bundled_mitre_query';
import { LEGACY_FRAMEWORK_VERSION } from '../../../../common/detection_engine/mitre/mitre_data_adapter';

export interface MitreConfiguration extends MitreEntitySummaryCollection {
  isLoading: boolean;
  isError: boolean;
}

const EMPTY_BUCKETS: MitreEntitySummaryBuckets = {
  tactics: [],
  techniques: [],
  subtechniques: [],
};

export const useMitreConfiguration = (
  params?: GetMitreEntitiesRequestParams
): MitreConfiguration => {
  const { services } = useKibana();
  // Feature flag from the mitreAttack plugin start contract: true → use managed API.
  const isManagedSourceEnabled = services.mitreAttack?.isEnabled ?? false;

  // The bundled legacy blob is ATT&CK Enterprise only; refuse other frameworks rather than
  // serving Enterprise data under another framework's name.
  const isUnsupportedLegacyFramework =
    !isManagedSourceEnabled &&
    params?.framework !== undefined &&
    params.framework !== DEFAULT_MITRE_FRAMEWORK;

  // Exactly one of the two queries below is enabled at a time.
  // Both produce the same MitreEntitySummaryBuckets shape, so consumers don't branch.
  const managedQuery = useFetchMitreEntitiesQuery(services.http, params ?? {}, {
    enabled: isManagedSourceEnabled,
  });

  // Legacy path: loads the bundled blob via lazy import. Goes away when the blob is removed.
  // Only `types` is meaningful here; the blob is one framework/version with no revoked/deprecated data.
  const legacyQuery = useFetchLegacyMitreQuery(params?.types, {
    enabled: !isManagedSourceEnabled && !isUnsupportedLegacyFramework,
  });

  const activeQuery = isManagedSourceEnabled ? managedQuery : legacyQuery;

  // Bucket order is guaranteed by both sources: tactics ascending by position (matrix
  // order), techniques and subtechniques ascending by name. Consumers render as-is.

  if (activeQuery.isError || !activeQuery.data || isUnsupportedLegacyFramework) {
    return {
      ...EMPTY_BUCKETS,
      frameworkVersion: undefined,
      isLoading: isUnsupportedLegacyFramework ? false : activeQuery.isLoading,
      isError: activeQuery.isError || isUnsupportedLegacyFramework,
    };
  }

  return {
    tactics: activeQuery.data.tactics,
    techniques: activeQuery.data.techniques,
    subtechniques: activeQuery.data.subtechniques,
    // Both paths expose the same frameworkVersion shape so callers never need to branch.
    frameworkVersion: isManagedSourceEnabled
      ? managedQuery.data?.framework_version
      : LEGACY_FRAMEWORK_VERSION,
    isLoading: activeQuery.isLoading,
    isError: activeQuery.isError,
  };
};
