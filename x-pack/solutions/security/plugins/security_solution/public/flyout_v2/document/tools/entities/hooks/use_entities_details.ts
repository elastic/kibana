/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { FF_ENABLE_ENTITY_STORE_V2, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import type { HostItem } from '../../../../../../common/search_strategy';
import type { EntityFromStoreResult } from '../../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { useEntityFromStore } from '../../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import type { IdentityFields } from '../../../../../flyout/document_details/shared/utils';
import { getField } from '../../../../../flyout/document_details/shared/utils';

export interface EntityDetailsData {
  name: string;
  entityId?: string;
}

export interface HostDetailsData extends EntityDetailsData {
  hostEntityFromStoreResult?: EntityFromStoreResult<HostItem> | null;
}

export interface UseEntitiesDetailsParams {
  hit: DataTableRecord;
}

export interface UseEntitiesDetailsResult {
  timestamp?: string;
  user?: EntityDetailsData;
  host?: HostDetailsData;
  hasAnyEntity: boolean;
}

const hasEntityName = (name: string | undefined): name is string => name != null && name !== '';

const getStringValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return getField(value) ?? undefined;
  }

  return typeof value === 'string' ? value : undefined;
};

const getLegacyIdentityFields = (
  field: 'host.name' | 'user.name',
  name: string | undefined
): IdentityFields | undefined => {
  return hasEntityName(name) ? { [field]: name } : undefined;
};

export const useEntitiesDetails = ({ hit }: UseEntitiesDetailsParams): UseEntitiesDetailsResult => {
  const euidApi = useEntityStoreEuidApi();
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);

  const timestamp = useMemo(() => getStringValue(getFieldValue(hit, '@timestamp')), [hit]);

  const userEntityIdentifiers = useMemo(
    () => euidApi?.euid.getEntityIdentifiersFromDocument('user', hit.flattened) as IdentityFields,
    [euidApi?.euid, hit.flattened]
  );
  const hostEntityIdentifiers = useMemo(
    () => euidApi?.euid.getEntityIdentifiersFromDocument('host', hit.flattened) as IdentityFields,
    [euidApi?.euid, hit.flattened]
  );

  const documentUserName = useMemo(() => getStringValue(getFieldValue(hit, 'user.name')), [hit]);
  const documentHostName = useMemo(() => getStringValue(getFieldValue(hit, 'host.name')), [hit]);

  const legacyUserIdentityForStore = getLegacyIdentityFields('user.name', documentUserName);
  const legacyHostIdentityForStore = getLegacyIdentityFields('host.name', documentHostName);
  const userIdentityFields = userEntityIdentifiers ?? legacyUserIdentityForStore;
  const hostIdentityFields = hostEntityIdentifiers ?? legacyHostIdentityForStore;

  const userEntityId = useMemo(
    () => euidApi?.euid.getEuidFromObject('user', hit.flattened),
    [euidApi?.euid, hit.flattened]
  );
  const hostEntityId = useMemo(
    () => euidApi?.euid.getEuidFromObject('host', hit.flattened),
    [euidApi?.euid, hit.flattened]
  );

  const userEntityFromStore = useEntityFromStore({
    entityId: userEntityId,
    identityFields: userIdentityFields,
    entityType: 'user',
    skip: !entityStoreV2Enabled || userIdentityFields == null,
  });
  const hostEntityFromStore = useEntityFromStore({
    entityId: hostEntityId,
    identityFields: hostIdentityFields,
    entityType: 'host',
    skip: !entityStoreV2Enabled || hostIdentityFields == null,
  });

  const hostRecord = hostEntityFromStore.entityRecord;
  const hostNameFromStore =
    hostRecord != null && 'host' in hostRecord ? getStringValue(hostRecord.host?.name) : undefined;

  const userDisplayName = userEntityFromStore.entityRecord?.entity?.name ?? documentUserName;
  const hostDisplayName =
    hostEntityFromStore.entityRecord?.entity?.name ??
    (entityStoreV2Enabled ? documentHostName ?? hostNameFromStore : documentHostName);

  const user =
    timestamp != null && hasEntityName(userDisplayName)
      ? {
          name: userDisplayName,
          entityId: userEntityFromStore.entityRecord?.entity?.id,
        }
      : undefined;
  const host =
    timestamp != null && hasEntityName(hostDisplayName)
      ? {
          name: hostDisplayName,
          entityId: hostEntityFromStore.entityRecord?.entity?.id,
          hostEntityFromStoreResult: entityStoreV2Enabled ? hostEntityFromStore : undefined,
        }
      : undefined;

  return {
    timestamp,
    user,
    host,
    hasAnyEntity: user != null || host != null,
  };
};
