/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MitreEntitySummaryBuckets,
  MitreEntitySummaryCollection,
  GetMitreEntitiesRequestParams,
} from '@kbn/security-mitre-attack-common';
import { useFetchMitreEntitiesQuery } from '@kbn/mitre-attack-plugin/public';
import { useKibana } from '../../lib/kibana';
import { useAppToasts } from '../use_app_toasts';
import { useFetchLegacyMitreQuery } from './use_fetch_bundled_mitre_query';
import * as i18n from './translations';

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
  const isEnabled = services.mitreAttack?.isEnabled ?? false;
  const { addError } = useAppToasts();

  // Exactly one of the two queries below is enabled at a time.
  // Both produce the same MitreEntitySummaryBuckets shape, so consumers never branch.
  const managedQuery = useFetchMitreEntitiesQuery(params ?? {}, {
    enabled: isEnabled,
    onError: (error) => {
      addError(error, { title: i18n.MITRE_CONFIGURATION_FETCH_ERROR });
    },
  });

  // Legacy path: loads the bundled blob via lazy import. Goes away when the blob is removed.
  // Only `types` is meaningful here; the blob is one framework/version with no revoked/deprecated data.
  const legacyQuery = useFetchLegacyMitreQuery(params?.types, {
    enabled: !isEnabled,
    onError: (error) => {
      addError(error, { title: i18n.MITRE_CONFIGURATION_FETCH_ERROR });
    },
  });

  const activeQuery = isEnabled ? managedQuery : legacyQuery;

  if (activeQuery.isError || !activeQuery.data) {
    return {
      ...EMPTY_BUCKETS,
      frameworkVersion: undefined,
      isLoading: activeQuery.isLoading,
      isError: activeQuery.isError,
    };
  }

  return {
    tactics: activeQuery.data.tactics,
    techniques: activeQuery.data.techniques,
    subtechniques: activeQuery.data.subtechniques,
    frameworkVersion: isEnabled ? managedQuery.data?.framework_version : undefined,
    isLoading: activeQuery.isLoading,
    isError: activeQuery.isError,
  };
};
