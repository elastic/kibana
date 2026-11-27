/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useEntityFromStore } from '../../../../shared/hooks/use_entity_from_store';
import { HostDetails } from '../../../../shared/components/entities/host_details';
import { UserDetails } from '../../../../shared/components/entities/user_details';
import type { GetFieldsData } from '../../../../shared/hooks/use_get_fields_data';
import {
  createGetFieldsDataFromAlertSource,
  resolveHostNameForEntityInsightsWithFallback,
  resolveUserNameForEntityInsightsWithFallback,
  type IdentityFields,
} from '../../../../shared/utils/document_utils';
import type { AttackEntityListEntry } from '../hooks/use_attack_entities_lists';
import type { EntitySectionOverrides } from '../../../../shared/components/entities/entities_details';

const resolveUserDisplayForEntities = (
  identityFields: IdentityFields | undefined,
  getFieldsData: GetFieldsData
): string | undefined =>
  resolveUserNameForEntityInsightsWithFallback(identityFields, getFieldsData);

const resolveHostDisplayForEntities = (
  identityFields: IdentityFields | undefined,
  getFieldsData: GetFieldsData,
  hostNameFromStore: string | undefined
): string | undefined => {
  const fromDocument = resolveHostNameForEntityInsightsWithFallback(identityFields, getFieldsData);
  return fromDocument ?? hostNameFromStore;
};

export interface AttackInsightsRowBaseProps extends AttackEntityListEntry {
  timestamp: string;
  scopeId: string;
  /**
   * Optional renderer for the host.ip value shown in the entity overview. Forwarded to
   * `HostDetails`/`UserDetails` so the attack Entities tool can open the network flyout as a
   * child via the new flyout system, instead of the (unavailable) expandable-flyout API.
   */
  renderIpLink?: (ip: string) => React.ReactNode;
  /**
   * The row calls this factory with the entity-store-resolved display name and entity ID, then
   * forwards the resulting overrides (onPreviewEntity / onShowDetailsPanel / linkRenderer) to
   * `HostDetails`/`UserDetails`. This ensures the flyout callbacks receive the store-resolved
   * identity (not raw identity fields), which is required for correct alert and insight queries
   * when Entity Store v2 is on.
   */
  buildEntityOverrides: (opts: { name: string; entityId?: string }) => EntitySectionOverrides;
}

/**
 * One host row for Attack Details entities tab: mirrors {@link EntitiesDetails} display resolution
 * (document fields + entity store) so headers use host.name, not raw EUID / entity.id.
 */
export const AttackHostInsightsRow: React.FC<AttackInsightsRowBaseProps> = memo(
  ({ identityFields, sampleSource, timestamp, scopeId, renderIpLink, buildEntityOverrides }) => {
    const euidApi = useEntityStoreEuidApi();

    const getFieldsData = useMemo(
      () => createGetFieldsDataFromAlertSource(sampleSource),
      [sampleSource]
    );

    const dataAsNestedObject = sampleSource as unknown as Ecs;

    const hostEntityId = euidApi?.euid.getEuidFromObject(
      euidApi.getBuiltInEntityDefinition('host'),
      dataAsNestedObject
    );
    const hostEntityFromStore = useEntityFromStore({
      entityId: hostEntityId,
      identityFields: identityFields ?? undefined,
      entityType: 'host',
      skip: !identityFields,
    });

    const hostRecord = hostEntityFromStore.entityRecord;
    const hostNameFromStore =
      hostRecord != null && 'host' in hostRecord ? hostRecord.host?.name : undefined;

    const resolvedHostName = resolveHostDisplayForEntities(
      identityFields,
      getFieldsData,
      hostNameFromStore
    );

    const hostDisplayName = hostEntityFromStore.entityRecord?.entity?.name ?? resolvedHostName;
    const hostEntityStoreId = hostEntityFromStore.entityRecord?.entity?.id;

    // Must be called before the early return (rules of hooks). Uses the store-resolved name/id so
    // callbacks query the same identity as AlertCountInsight.
    const resolvedOverrides = useMemo(
      () => buildEntityOverrides({ name: hostDisplayName ?? '', entityId: hostEntityStoreId }),
      [buildEntityOverrides, hostDisplayName, hostEntityStoreId]
    );

    if (hostDisplayName == null) {
      return null;
    }

    return (
      <HostDetails
        hostName={hostDisplayName}
        entityId={hostEntityStoreId}
        timestamp={timestamp}
        scopeId={scopeId}
        isAttackDetails={true}
        renderIpLink={renderIpLink}
        onPreviewEntity={resolvedOverrides.onPreviewEntity}
        onShowDetailsPanel={resolvedOverrides.onShowDetailsPanel}
        linkRenderer={resolvedOverrides.linkRenderer}
        hostEntityFromStoreResult={hostEntityFromStore}
      />
    );
  }
);

AttackHostInsightsRow.displayName = 'AttackHostInsightsRow';

/**
 * One user row for Attack Details entities tab: mirrors {@link EntitiesDetails} user resolution.
 */
export const AttackUserInsightsRow: React.FC<AttackInsightsRowBaseProps> = memo(
  ({ identityFields, sampleSource, timestamp, scopeId, renderIpLink, buildEntityOverrides }) => {
    const euidApi = useEntityStoreEuidApi();

    const getFieldsData = useMemo(
      () => createGetFieldsDataFromAlertSource(sampleSource),
      [sampleSource]
    );

    const resolvedUserName = resolveUserDisplayForEntities(identityFields, getFieldsData);
    const legacyUserIdentityForStore =
      resolvedUserName != null && resolvedUserName !== ''
        ? ({ 'user.name': resolvedUserName } as IdentityFields)
        : undefined;

    const dataAsNestedObject = sampleSource as unknown as Ecs;

    const userEntityId = euidApi?.euid.getEuidFromObject(
      euidApi.getBuiltInEntityDefinition('user'),
      dataAsNestedObject
    );
    const userEntityFromStore = useEntityFromStore({
      entityId: userEntityId,
      identityFields: identityFields ?? legacyUserIdentityForStore,
      entityType: 'user',
      skip: identityFields == null && legacyUserIdentityForStore == null,
    });

    const userDisplayName = userEntityFromStore.entityRecord?.entity?.name ?? resolvedUserName;
    const userEntityStoreId = userEntityFromStore.entityRecord?.entity?.id;

    // Must be called before the early return (rules of hooks). Uses the store-resolved name/id so
    // callbacks query the same identity as AlertCountInsight.
    const resolvedOverrides = useMemo(
      () => buildEntityOverrides({ name: userDisplayName ?? '', entityId: userEntityStoreId }),
      [buildEntityOverrides, userDisplayName, userEntityStoreId]
    );

    if (userDisplayName == null) {
      return null;
    }

    return (
      <UserDetails
        userName={userDisplayName}
        entityId={userEntityStoreId}
        timestamp={timestamp}
        scopeId={scopeId}
        isAttackDetails={true}
        renderIpLink={renderIpLink}
        onPreviewEntity={resolvedOverrides.onPreviewEntity}
        onShowDetailsPanel={resolvedOverrides.onShowDetailsPanel}
        linkRenderer={resolvedOverrides.linkRenderer}
      />
    );
  }
);

AttackUserInsightsRow.displayName = 'AttackUserInsightsRow';
