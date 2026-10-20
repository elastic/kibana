/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { SYNTHETICS_API_URLS } from '../../../../../../common/constants';
import type { OutdatedMwAgentLocationsResponse } from '../../../../../../common/utils/agent_mw_support';
import { apiService } from '../../../../../utils/api_service/api_service';
import { useSyntheticsRefreshContext } from '../../../contexts';
import { useUrlSpaceId } from '../../../hooks/use_url_space_id';

/**
 * Private location ids with at least one enrolled agent whose version
 * predates Maintenance Window support, so monitors assigned a maintenance
 * window there may keep running through it.
 */
export const useOutdatedMwAgentLocationIds = () => {
  const spaceId = useUrlSpaceId();
  const { lastRefresh } = useSyntheticsRefreshContext();
  const fetchOutdatedLocations = useCallback(
    () =>
      apiService.get<OutdatedMwAgentLocationsResponse>(
        SYNTHETICS_API_URLS.PRIVATE_LOCATION_OUTDATED_MW_AGENTS,
        { spaceId }
      ),
    [spaceId]
  );
  const { data } = useFetcher(fetchOutdatedLocations, [fetchOutdatedLocations, lastRefresh]);

  const outdatedLocationIds = useMemo(() => new Set(data?.outdatedLocationIds ?? []), [data]);

  return { outdatedLocationIds };
};
