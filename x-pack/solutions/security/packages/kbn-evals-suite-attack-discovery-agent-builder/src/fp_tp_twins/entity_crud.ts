/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FpTpIndexedEntity } from './types';

export type FpTpEntityCrudType = 'host' | 'generic';

export interface FpTpEntityCrudRequest {
  readonly entityType: FpTpEntityCrudType;
  readonly entityId: string;
  readonly body: Record<string, unknown>;
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asKeywordArray = (value: unknown): string[] | undefined => {
  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value;
  }
  return undefined;
};

const entityFieldsFromSource = (source: Record<string, unknown>): Record<string, unknown> => {
  const entity =
    typeof source.entity === 'object' && source.entity !== null
      ? (source.entity as Record<string, unknown>)
      : {};
  return {
    id: entity.id,
    name: entity.name,
    type: entity.type,
    sub_type: entity.sub_type,
    source: ['manual'],
    EngineMetadata: entity.EngineMetadata,
    risk: entity.risk,
  };
};

/**
 * Maps an authored twin entity document onto the Entity Store CRUD body.
 *
 * Hosts go to `POST .../entities/host`. Users cannot: UserEntity is strict and
 * omits `host.id`, which local-namespace EUIDs need. Users are created as
 * generic records with the authored `entity.id` so gold evidence ids still resolve.
 */
export const toEntityCrudRequest = (entity: FpTpIndexedEntity): FpTpEntityCrudRequest => {
  const entityFields = entityFieldsFromSource(entity.source);
  const entityTypeName = asString(entityFields.type);

  if (entityTypeName === 'host') {
    const host =
      typeof entity.source.host === 'object' && entity.source.host !== null
        ? (entity.source.host as Record<string, unknown>)
        : {};
    return {
      entityType: 'host',
      entityId: entity.id,
      body: {
        '@timestamp': entity.source['@timestamp'],
        labels: entity.source.labels,
        host: {
          name: host.name,
          hostname: asKeywordArray(host.hostname ?? host.name),
          id: asKeywordArray(host.id),
          os: host.os,
        },
        asset: entity.source.asset,
        entity: entityFields,
      },
    };
  }

  return {
    entityType: 'generic',
    entityId: entity.id,
    body: {
      '@timestamp': entity.source['@timestamp'],
      labels: entity.source.labels,
      asset: entity.source.asset,
      entity: entityFields,
    },
  };
};
