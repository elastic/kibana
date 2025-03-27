/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useEffect, useMemo, useState } from 'react';
import { keyBy } from 'lodash';
import { useBulkFetchFleetIntegrationPolicies } from '../policy/use_bulk_fetch_fleet_integration_policies';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { getPolicyIdsFromArtifact } from '../../../../common/endpoint/service/artifacts';

export interface ArtifactRestrictedPolicyAssignments {
  isLoading: boolean;
  /** The list of policy IDs assigned to the artifact that are NOT currently accessible in active space */
  policyIds: string[];
}

/**
 * Given an artifact item, hook will calculate if any of the policies assigned to it
 * are restricted (not accessible by the current user) in the active space.
 *
 * NOTE: this hook's logic is executed at most once per artifact
 *
 * @param item
 */
export const useArtifactRestrictedPolicyAssignments = (
  item: Partial<Pick<ExceptionListItemSchema, 'tags' | 'item_id'>>
): ArtifactRestrictedPolicyAssignments => {
  const isSpaceAwarenessEnabled = useIsExperimentalFeatureEnabled(
    'endpointManagementSpaceAwarenessEnabled'
  );
  const [{ itemId, policies }, setOriginalItem] = useState<{ itemId: string; policies: string[] }>({
    itemId: item.item_id ?? '',
    policies: getPolicyIdsFromArtifact(item),
  });

  const { data, isFetching } = useBulkFetchFleetIntegrationPolicies(
    { ids: policies },
    { enabled: isSpaceAwarenessEnabled && policies.length > 0 }
  );

  const restrictedPolicyIds = useMemo(() => {
    if (!isSpaceAwarenessEnabled || !data?.items) {
      return [];
    }

    const policiesFoundById = keyBy(data.items, 'id');

    return policies.filter((id) => !policiesFoundById[id]);
  }, [data?.items, isSpaceAwarenessEnabled, policies]);

  useEffect(() => {
    if (item.item_id !== itemId) {
      setOriginalItem({
        itemId: item.item_id ?? '',
        policies: getPolicyIdsFromArtifact(item),
      });
    }
  }, [item, itemId]);

  return useMemo(() => {
    return {
      isLoading: isSpaceAwarenessEnabled && policies.length > 0 ? isFetching : false,
      policyIds: restrictedPolicyIds,
    };
  }, [isFetching, isSpaceAwarenessEnabled, policies.length, restrictedPolicyIds]);
};
