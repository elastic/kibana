/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { SYNTHETICS_API_URLS } from '../../../../../../common/constants';
import type { MissingCompleteAgentLocationsResponse } from '../../../../../../common/types';
import { apiService } from '../../../../../utils/api_service/api_service';
import { useSyntheticsRefreshContext } from '../../../contexts';
import { useUrlSpaceId } from '../../../hooks/use_url_space_id';

/** Private locations with no active agent that can run browser monitors. */
export const useMissingCompleteAgentLocations = () => {
  const spaceId = useUrlSpaceId();
  const { lastRefresh } = useSyntheticsRefreshContext();
  const fetchLocations = useCallback(
    () =>
      apiService.get<MissingCompleteAgentLocationsResponse>(
        SYNTHETICS_API_URLS.PRIVATE_LOCATION_MISSING_COMPLETE_AGENTS,
        { spaceId }
      ),
    [spaceId]
  );
  const { data } = useFetcher(fetchLocations, [fetchLocations, lastRefresh]);

  return { locations: data?.locations };
};
