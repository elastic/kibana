/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import { FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/common';
import type { EntityAnalyticsPrivileges } from '../../../../../common/api/entity_analytics';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { useKibana } from '../../../../common/lib/kibana';

export const GET_ENTITY_ENGINE_PRIVILEGES = ['get_entity_engine_privileges'] as const;

export const useEntityEnginePrivileges = (): UseQueryResult<
  EntityAnalyticsPrivileges,
  SecurityAppError
> => {
  const { fetchEntityStorePrivileges, fetchEntityStoreV2Privileges } = useEntityAnalyticsRoutes();
  const { uiSettings } = useKibana().services;
  const isEntityStoreV2Enabled = uiSettings?.get<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);

  return useQuery(
    [...GET_ENTITY_ENGINE_PRIVILEGES, isEntityStoreV2Enabled],
    isEntityStoreV2Enabled ? fetchEntityStoreV2Privileges : fetchEntityStorePrivileges
  );
};
