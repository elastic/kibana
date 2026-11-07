/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { GoogleAdkContext } from '../../../../../common/entity_intelligence/google_adk';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import {
  googleRequesterEntityFilter,
  isVerifiedGoogleUser,
  resolveGoogleRequesterEntity,
} from '../ai_agents/google_requester_identity';

export const useGoogleRequesterEntity = (requester?: GoogleAdkContext['requester']) => {
  const { fetchEntitiesListV2 } = useEntityAnalyticsRoutes();
  const spaceId = useSpaceId();
  const enabled = Boolean(spaceId) && isVerifiedGoogleUser(requester);
  const query = useQuery(
    ['entityIntelligenceGoogleRequester', spaceId, requester?.subject, requester?.email],
    ({ signal }) =>
      fetchEntitiesListV2({
        signal,
        params: {
          entityTypes: [EntityType.user],
          page: 1,
          perPage: 2,
          filterQuery: requester ? googleRequesterEntityFilter(requester) : undefined,
        },
      }),
    { enabled, retry: 1, refetchOnWindowFocus: false }
  );
  return {
    entity:
      enabled && !query.isError && query.data
        ? resolveGoogleRequesterEntity(requester, query.data.records, query.data.total)
        : undefined,
    isLoading: enabled && query.isLoading,
    unavailable: enabled && query.isError,
    refetch: query.refetch,
  };
};
