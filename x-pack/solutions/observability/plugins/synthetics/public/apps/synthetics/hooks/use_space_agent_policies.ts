/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibanaSpace } from '@kbn/observability-shared-plugin/public';
import { useSelector } from 'react-redux';
import { selectAgentPolicies } from '../state/agent_policies';

export const useSpaceAgentPolicies = () => {
  const { data: allPolicies, loading: isLoadingPolicies } = useSelector(selectAgentPolicies);
  const { space, loading: isLoadingSpace } = useKibanaSpace();

  const spacePolicies =
    allPolicies && space && !isLoadingSpace
      ? allPolicies?.filter(({ spaceIds }) => {
          return spaceIds.includes(space.id);
        })
      : undefined;

  return { loading: isLoadingPolicies || isLoadingSpace, spacePolicies };
};
