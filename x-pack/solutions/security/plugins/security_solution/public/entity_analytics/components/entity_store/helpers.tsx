/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IconType } from '@elastic/eui';
import { EntityType } from '../../../../common/entity_analytics/types';

import {
  ASSET_CRITICALITY_INDEX_PATTERN,
  RISK_SCORE_INDEX_PATTERN,
} from '../../../../common/constants';
import type {
  Entity,
  EntityField,
  HostEntity,
  UserEntity,
  ServiceEntity,
  GenericEntity,
} from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';

/**
 * Sanitizes entity field for upsert: only pass through keys allowed by EntityField.
 * Omits EngineMetadata so the backend does not reject "entity.EngineMetadata.Type" as not allowed to be updated.
 */
function sanitizeEntityField(field: EntityField | undefined): EntityField | undefined {
  if (!field || typeof field.id !== 'string') return undefined;
  return {
    id: field.id,
    ...(field.name !== undefined && { name: field.name }),
    ...(field.type !== undefined && { type: field.type }),
    ...(field.sub_type !== undefined && { sub_type: field.sub_type }),
    ...(field.source !== undefined && { source: field.source }),
    ...(field.attributes !== undefined && { attributes: field.attributes }),
    ...(field.behaviors !== undefined && { behaviors: field.behaviors }),
    ...(field.lifecycle !== undefined && { lifecycle: field.lifecycle }),
    ...(field.relationships !== undefined && { relationships: field.relationships }),
    ...(field.risk !== undefined && { risk: field.risk }),
  };
}

/** Allowed keys for HostEntity.host (strict schema; e.g. 'os' is not allowed). */
function toArray(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    return value.every((x) => typeof x === 'string') ? (value as string[]) : undefined;
  }
  if (typeof value === 'string') return [value];
  return undefined;
}

function sanitizeHostForUpsert(host: Record<string, unknown>): HostEntity['host'] {
  const name = host.name;
  if (typeof name !== 'string') return { name: '' };
  const out: NonNullable<HostEntity['host']> = {
    name,
    ...(toArray(host.hostname) && { hostname: toArray(host.hostname) }),
    ...(toArray(host.domain) && { domain: toArray(host.domain) }),
    ...(toArray(host.ip) && { ip: toArray(host.ip) }),
    ...(toArray(host.id) && { id: toArray(host.id) }),
    ...(toArray(host.type) && { type: toArray(host.type) }),
    ...(toArray(host.mac) && { mac: toArray(host.mac) }),
    ...(toArray(host.architecture) && { architecture: toArray(host.architecture) }),
  };
  if (host.risk != null && typeof host.risk === 'object') {
    out.risk = host.risk as NonNullable<HostEntity['host']>['risk'];
  }
  if (host.entity != null && typeof host.entity === 'object') {
    const sanitized = sanitizeEntityField(host.entity as EntityField);
    if (sanitized) out.entity = sanitized;
  }
  return out;
}

/** Allowed keys for UserEntity.user (strict schema; e.g. 'group' is not allowed). user.id must be array. */
function sanitizeUserForUpsert(user: Record<string, unknown>): NonNullable<UserEntity['user']> {
  const name = user.name;
  if (typeof name !== 'string') return { name: '' };
  const out: NonNullable<UserEntity['user']> = {
    name,
    ...(toArray(user.id) && { id: toArray(user.id) }),
    ...(toArray(user.full_name) && { full_name: toArray(user.full_name) }),
    ...(toArray(user.domain) && { domain: toArray(user.domain) }),
    ...(toArray(user.roles) && { roles: toArray(user.roles) }),
    ...(toArray(user.email) && { email: toArray(user.email) }),
    ...(toArray(user.hash) && { hash: toArray(user.hash) }),
  };
  if (user.risk != null && typeof user.risk === 'object') {
    out.risk = user.risk as NonNullable<UserEntity['user']>['risk'];
  }
  return out;
}

/**
 * Returns a record that conforms to the Entity Store upsert API schema.
 * List/index documents can include extra fields (e.g. `agent`, `entity.EngineMetadata.UntypedId`).
 * The upsert API uses a strict schema and rejects unknown keys.
 */
export function sanitizeEntityRecordForUpsert(record: Entity): Entity {
  const entityType = getEntityType(record);
  const raw = record as Record<string, unknown>;
  const entity: EntityField =
    sanitizeEntityField(record.entity) ??
    (record.entity && {
      ...record.entity,
      EngineMetadata: undefined,
    });

  if (!entity) {
    throw new Error('Entity record must have a valid entity field with id');
  }

  if (entityType === 'host') {
    return buildHostEntityForUpsert(entity, raw);
  }
  if (entityType === 'user') {
    return buildUserEntityForUpsert(entity, raw);
  }
  if (entityType === 'service') {
    return buildServiceEntityForUpsert(entity, raw);
  }
  return buildGenericEntityForUpsert(entity, raw);
}

function buildHostEntityForUpsert(entity: EntityField, raw: Record<string, unknown>): HostEntity {
  return {
    entity,
    ...(raw.host != null &&
      typeof raw.host === 'object' && {
        host: sanitizeHostForUpsert(raw.host as Record<string, unknown>),
      }),
    ...(raw.asset != null &&
      typeof raw.asset === 'object' && {
        asset: raw.asset as HostEntity['asset'],
      }),
    ...(raw.event != null &&
      typeof raw.event === 'object' && {
        event: raw.event as HostEntity['event'],
      }),
  };
}

function buildUserEntityForUpsert(entity: EntityField, raw: Record<string, unknown>): UserEntity {
  return {
    entity,
    ...(raw.user != null &&
      typeof raw.user === 'object' && {
        user: sanitizeUserForUpsert(raw.user as Record<string, unknown>),
      }),
    ...(raw.asset != null &&
      typeof raw.asset === 'object' && {
        asset: raw.asset as UserEntity['asset'],
      }),
    ...(raw.event != null &&
      typeof raw.event === 'object' && {
        event: raw.event as UserEntity['event'],
      }),
  };
}

function buildServiceEntityForUpsert(
  entity: EntityField,
  raw: Record<string, unknown>
): ServiceEntity {
  return {
    entity,
    ...(raw.service != null &&
      typeof raw.service === 'object' && {
        service: raw.service as ServiceEntity['service'],
      }),
    ...(raw.asset != null &&
      typeof raw.asset === 'object' && {
        asset: raw.asset as ServiceEntity['asset'],
      }),
    ...(raw.event != null &&
      typeof raw.event === 'object' && {
        event: raw.event as ServiceEntity['event'],
      }),
  };
}

function buildGenericEntityForUpsert(
  entity: EntityField,
  raw: Record<string, unknown>
): GenericEntity {
  return {
    entity,
    ...(raw.asset != null &&
      typeof raw.asset === 'object' && {
        asset: raw.asset as GenericEntity['asset'],
      }),
  };
}

/** Keys used when entity fields are flattened at top level (e.g. from ES/search API) */
const FLAT_ENTITY_TYPE_KEY = 'entity.type';
const FLAT_ENTITY_ENGINE_TYPE_KEY = 'entity.EngineMetadata.Type';

/** Display values for entity.type (e.g. from entity store extraction) mapped to EntityType */
const ENTITY_TYPE_DISPLAY_TO_ENUM: Record<string, EntityType> = {
  Host: EntityType.host,
  Identity: EntityType.user,
  Service: EntityType.service,
};

export const getEntityType = (record: Entity): EntityType => {
  // Prefer nested form, then flattened top-level keys (e.g. entity store / search results)
  const recordAny = record as Record<string, unknown>;
  const rawType =
    record.entity?.EngineMetadata?.Type ??
    record.entity?.type ??
    recordAny[FLAT_ENTITY_ENGINE_TYPE_KEY] ??
    recordAny[FLAT_ENTITY_TYPE_KEY];

  if (!rawType || typeof rawType !== 'string') {
    throw new Error(`Unexpected entity: ${JSON.stringify(record)}`);
  }

  const normalized =
    ENTITY_TYPE_DISPLAY_TO_ENUM[rawType] ??
    (Object.values(EntityType).includes(rawType as EntityType)
      ? (rawType as EntityType)
      : undefined);
  if (normalized === undefined) {
    throw new Error(`Unexpected entity: ${JSON.stringify(record)}`);
  }

  return normalized;
};

export const EntityIconByType: Record<EntityType, IconType> = {
  [EntityType.user]: 'user',
  [EntityType.host]: 'storage',
  [EntityType.service]: 'node',
  [EntityType.generic]: 'globe',
};

export const sourceFieldToText = (source: string) => {
  if (source.match(`^${RISK_SCORE_INDEX_PATTERN}`)) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.entityStore.helpers.sourceField.riskDescription"
        defaultMessage="Risk"
      />
    );
  }

  if (source.match(`^${ASSET_CRITICALITY_INDEX_PATTERN}`)) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.entityStore.helpers.sourceField.criticalityDescription"
        defaultMessage="Asset Criticality"
      />
    );
  }

  return (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.entityStore.helpers.sourceField.eventDescription"
      defaultMessage="Events"
    />
  );
};
