/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiSkeletonText, EuiText } from '@elastic/eui';
import { useEntityFromStore } from '../../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { HostDetails } from '../../../../../flyout/document_details/left/components/host_details';
import { UserDetails } from '../../../../../flyout/document_details/left/components/user_details';
import type { EntitySectionOverrides } from '../../../../../flyout/document_details/left/components/entities_details';
import type { PersistedAttackEntityType } from '../hooks/use_persisted_attack_entities';
import {
  ATTACK_ENTITIES_TOOL_PERSISTED_ROW_LOADING_TEST_ID,
  ATTACK_ENTITIES_TOOL_SERVICE_ROW_TEST_ID,
} from '../test_ids';

/**
 * Best-effort display name parsed from the EUID itself, used only when the Entity Store record
 * cannot be fetched (e.g. deleted entity): strips the `<type>:` prefix and keeps the segment
 * before the first `@` (RFC D12 — e.g. `user:jdoe@HW-UUID@local` -> `jdoe`).
 */
export const getEntityNameFromEuid = (
  euid: string,
  entityType: PersistedAttackEntityType
): string => {
  const prefix = `${entityType}:`;
  const withoutPrefix = euid.startsWith(prefix) ? euid.slice(prefix.length) : euid;
  const beforeFirstAt = withoutPrefix.split('@')[0];
  return beforeFirstAt !== '' ? beforeFirstAt : euid;
};

export interface PersistedEntityRowProps {
  /** Canonical EUID persisted on the attack document (`kibana.alert.attack_discovery.entities[].id`). */
  entityId: string;
  entityType: PersistedAttackEntityType;
  /** Timestamp of the attack document, forwarded to the entity detail shells. */
  timestamp: string;
  /**
   * Optional renderer for host.ip values, forwarded to `HostDetails`/`UserDetails` so IPs open
   * the network flyout via the new flyout system.
   */
  renderIpLink?: (ip: string) => React.ReactNode;
  /**
   * Override builder from `useEntityFlyoutOverrides`. Called with the store-resolved display
   * name but the exact persisted EUID, so clicking always opens the flyout for the persisted
   * entity (RFC D12).
   */
  buildEntityOverrides?: (opts: { name: string; entityId?: string }) => EntitySectionOverrides;
}

/**
 * One entity row of the attack Entities tool for a persisted (pre-correlated) EUID.
 * Resolves the Entity Store record by `entity.id` alone — no identity fields required — and
 * renders the same `HostDetails`/`UserDetails` shells as the aggregation-based rows. Service
 * entities have no detail shell, so they render as a simple name row.
 */
export const PersistedEntityRow = memo(
  ({
    entityId,
    entityType,
    timestamp,
    renderIpLink,
    buildEntityOverrides,
  }: PersistedEntityRowProps) => {
    const entityFromStore = useEntityFromStore({ entityId, entityType, skip: false });
    const record = entityFromStore.entityRecord;

    const nameFromStore = useMemo(() => {
      if (record == null) {
        return undefined;
      }
      // RFC D12: user labels show the plain user.name (not the EUID-shaped canonical name).
      if (entityType === 'user' && 'user' in record && record.user?.name) {
        return record.user.name;
      }
      return record.entity?.name;
    }, [record, entityType]);

    const displayName = nameFromStore ?? getEntityNameFromEuid(entityId, entityType);

    const overrides = useMemo(
      () =>
        buildEntityOverrides != null
          ? buildEntityOverrides({ name: displayName, entityId })
          : undefined,
      [buildEntityOverrides, displayName, entityId]
    );

    if (entityFromStore.isInitialLoading) {
      return (
        <EuiSkeletonText
          lines={2}
          data-test-subj={ATTACK_ENTITIES_TOOL_PERSISTED_ROW_LOADING_TEST_ID}
        />
      );
    }

    if (entityType === 'user') {
      return (
        <UserDetails
          userName={displayName}
          entityId={entityId}
          timestamp={timestamp}
          scopeId=""
          isAttackDetails={true}
          renderIpLink={renderIpLink}
          onPreviewEntity={overrides?.onPreviewEntity}
          onShowDetailsPanel={overrides?.onShowDetailsPanel}
          linkRenderer={overrides?.linkRenderer}
        />
      );
    }

    if (entityType === 'host') {
      return (
        <HostDetails
          hostName={displayName}
          entityId={entityId}
          timestamp={timestamp}
          scopeId=""
          isAttackDetails={true}
          renderIpLink={renderIpLink}
          onPreviewEntity={overrides?.onPreviewEntity}
          onShowDetailsPanel={overrides?.onShowDetailsPanel}
          linkRenderer={overrides?.linkRenderer}
          hostEntityFromStoreResult={entityFromStore}
        />
      );
    }

    // Services have no HostDetails/UserDetails-style shell — render a simple name row.
    return (
      <EuiText size="s" data-test-subj={ATTACK_ENTITIES_TOOL_SERVICE_ROW_TEST_ID}>
        {displayName}
      </EuiText>
    );
  }
);

PersistedEntityRow.displayName = 'PersistedEntityRow';
