/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { PolicyData } from '../../../../../common/endpoint/types';
import { getPolicyIdsFromArtifact } from '../../../../../common/endpoint/service/artifacts';
import { useBulkFetchFleetIntegrationPolicies } from '../../../hooks/policy/use_bulk_fetch_fleet_integration_policies';
import type { MenuItemPropsByPolicyId } from '../../artifact_entry_card';
import { useEndpointPoliciesToArtifactPolicies } from '../../artifact_entry_card';
import { getLoadPoliciesError } from '../../../common/translations';
import { useToasts } from '../../../../common/lib/kibana';

/**
 * Resolves policy names and navigation links for artifacts assigned per-policy.
 */
export const useArtifactAssignedPolicies = (
  items: ExceptionListItemSchema[]
): { policies: MenuItemPropsByPolicyId; isLoading: boolean } => {
  const toasts = useToasts();

  const itemsPolicyIds = useMemo(() => {
    return items.flatMap((item) => getPolicyIdsFromArtifact(item));
  }, [items]);

  const {
    data: policyData,
    error,
    isFetching,
  } = useBulkFetchFleetIntegrationPolicies<PolicyData>(
    { ids: itemsPolicyIds },
    { enabled: itemsPolicyIds.length > 0 }
  );

  const policies = useEndpointPoliciesToArtifactPolicies(policyData?.items);

  useEffect(() => {
    if (error) {
      toasts.addDanger(getLoadPoliciesError(error));
    }
  }, [error, toasts]);

  return {
    policies,
    isLoading: itemsPolicyIds.length > 0 && isFetching,
  };
};
