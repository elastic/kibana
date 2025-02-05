/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import type { EntityAnalyticsPrivileges } from '../../../../../common/api/entity_analytics';
import { useEntityAnalyticsRoutes } from '../../../api/api';

export const GET_ENTITY_ENGINE_PRIVILEGES = ['get_entity_engine_privileges'] as const;

export const useEntityEnginePrivileges = (): UseQueryResult<
  EntityAnalyticsPrivileges,
  SecurityAppError
> => {
  const { fetchEntityStorePrivileges } = useEntityAnalyticsRoutes();
  return useQuery(GET_ENTITY_ENGINE_PRIVILEGES, fetchEntityStorePrivileges);
};
