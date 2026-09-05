/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useResolvedLatestEntitiesIndexName } from '../../../common/hooks/use_resolved_latest_entities_index_name';

interface EntitiesIndexExistsResult {
  indexExists: boolean;
}

/**
 * Hook to check if the Entity Store v2 entities index exists.
 *
 * TEMPORARY WORKAROUND: This hook exists because the "editor" and "viewer"
 * Serverless roles lack saved-object permissions for the Entity Store plugin's
 * SO types (entity-engine-descriptor-v2, entity-store-global-state), causing the
 * Entity Store `/status` endpoint to fail with a 403 for those roles.
 * Once those roles are compatible with the Entity Store `/status` endpoint,
 * this hook should be updated to check the status endpoint instead.
 *
 * Probes both the solution-neutral and the pre-migration Security-scoped
 * concrete index names, so un-migrated deployments (feature flag
 * `entityStore.migrateLegacySecurityAssets` off) still report the store as
 * available.
 */
export const useIsEntityStoreV2Available = (): { data?: EntitiesIndexExistsResult } => {
  const spaceId = useSpaceId();
  const { data } = useResolvedLatestEntitiesIndexName(spaceId);

  return useMemo(() => ({ data: data && { indexExists: data.indexName != null } }), [data]);
};
