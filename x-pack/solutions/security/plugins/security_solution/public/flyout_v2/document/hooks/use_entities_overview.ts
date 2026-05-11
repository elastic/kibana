/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { FF_ENABLE_ENTITY_STORE_V2, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import {
  useEntityFromStore,
  type EntityStoreRecord,
} from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';

export interface EntityOverviewData {
  /**
   * Display name for the entity overview card.
   */
  name: string;
  /**
   * EUID-derived identity fields for downstream entity insights.
   */
  identityFields?: Record<string, string>;
  /**
   * Entity Store v2 record used for risk/display data when available.
   */
  entityRecord?: EntityStoreRecord | null;
}

export interface UseEntitiesOverviewParams {
  /**
   * Document record used to retrieve host and user fields.
   */
  hit: DataTableRecord;
  /**
   * Pre-fetched ECS-nested object supplied by legacy adapters that already have it.
   * Flyout v2 and Discover derive identity from `hit.flattened`/`hit.raw` instead.
   */
  dataAsNestedObject?: Ecs | null;
}

export interface UseEntitiesOverviewResult {
  /**
   * Render-ready user overview data, when a user entity can be shown.
   */
  user?: EntityOverviewData;
  /**
   * Render-ready host overview data, when a host entity can be shown.
   */
  host?: EntityOverviewData;
  /**
   * Convenience flag for empty-state rendering.
   */
  hasAnyEntity: boolean;
}

const hasEntityName = (name: string | undefined): name is string => name != null && name !== '';

const getDocumentIdentitySource = (
  hit: DataTableRecord,
  dataAsNestedObject: Ecs | null | undefined
) => {
  if (dataAsNestedObject !== undefined) {
    return dataAsNestedObject;
  }

  if (Object.keys(hit.flattened).length > 0) {
    return hit.flattened;
  }

  return hit.raw;
};

const getLegacyIdentityFields = (
  field: 'host.name' | 'user.name',
  name: string | undefined
): Record<string, string> | undefined => {
  return hasEntityName(name) ? { [field]: name } : undefined;
};

const getEntityOverviewData = ({
  documentName,
  entityRecord,
  entityStoreV2Enabled,
  identityFields,
}: {
  documentName: string | undefined;
  entityRecord: EntityStoreRecord | null;
  entityStoreV2Enabled: boolean;
  identityFields: Record<string, string> | undefined;
}): EntityOverviewData | undefined => {
  const resolvedName = documentName || entityRecord?.entity?.name || '';
  const showOverview = entityStoreV2Enabled
    ? hasEntityName(resolvedName)
    : hasEntityName(documentName);

  if (!showOverview) {
    return undefined;
  }

  return {
    name: resolvedName,
    identityFields,
    entityRecord: entityStoreV2Enabled ? entityRecord : undefined,
  };
};

/**
 * Returns render-ready host and user entity overview data for the Insights section.
 */
export const useEntitiesOverview = ({
  hit,
  dataAsNestedObject,
}: UseEntitiesOverviewParams): UseEntitiesOverviewResult => {
  const hostName = getFieldValue(hit, 'host.name') as string | undefined;
  const userName = getFieldValue(hit, 'user.name') as string | undefined;

  const euidApi = useEntityStoreEuidApi();
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);

  const documentIdentitySource = getDocumentIdentitySource(hit, dataAsNestedObject);

  const hostEntityIdentifiers = useMemo(
    () => euidApi?.euid.getEntityIdentifiersFromDocument('host', documentIdentitySource),
    [euidApi?.euid, documentIdentitySource]
  );
  const userEntityIdentifiers = useMemo(
    () => euidApi?.euid.getEntityIdentifiersFromDocument('user', documentIdentitySource),
    [euidApi?.euid, documentIdentitySource]
  );

  const legacyUserIdentityForStore = getLegacyIdentityFields('user.name', userName);
  const legacyHostIdentityForStore = getLegacyIdentityFields('host.name', hostName);
  const userIdentityFields = userEntityIdentifiers ?? legacyUserIdentityForStore;
  const hostIdentityFields = hostEntityIdentifiers ?? legacyHostIdentityForStore;

  const hostEntityId = useMemo(
    () => euidApi?.euid.getEuidFromObject('host', documentIdentitySource),
    [euidApi?.euid, documentIdentitySource]
  );
  const userEntityId = useMemo(
    () => euidApi?.euid.getEuidFromObject('user', documentIdentitySource),
    [euidApi?.euid, documentIdentitySource]
  );

  const { entityRecord: userEntityRecord } = useEntityFromStore({
    entityId: userEntityId,
    identityFields: userIdentityFields,
    entityType: 'user',
    skip: !entityStoreV2Enabled || userIdentityFields == null,
  });
  const { entityRecord: hostEntityRecord } = useEntityFromStore({
    entityId: hostEntityId,
    identityFields: hostIdentityFields,
    entityType: 'host',
    skip: !entityStoreV2Enabled || hostIdentityFields == null,
  });

  const user = getEntityOverviewData({
    documentName: userName,
    entityRecord: userEntityRecord,
    entityStoreV2Enabled,
    identityFields: userEntityIdentifiers,
  });
  const host = getEntityOverviewData({
    documentName: hostName,
    entityRecord: hostEntityRecord,
    entityStoreV2Enabled,
    identityFields: hostEntityIdentifiers,
  });

  return {
    user,
    host,
    hasAnyEntity: user != null || host != null,
  };
};
