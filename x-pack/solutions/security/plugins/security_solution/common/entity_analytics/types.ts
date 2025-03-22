/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Use exclusively for the legacy risk score module
export enum LegacyEntityType {
  host = 'host',
  user = 'user',
}

export enum EntityType {
  user = 'user',
  host = 'host',
  service = 'service',
  generic = 'generic',
}

export enum EntityIdentifierFields {
  hostName = 'host.name',
  userName = 'user.name',
  serviceName = 'service.name',
  generic = 'entity.id',
}

export const EntityTypeToIdentifierField: Record<EntityType, EntityIdentifierFields> = {
  [EntityType.host]: EntityIdentifierFields.hostName,
  [EntityType.user]: EntityIdentifierFields.userName,
  [EntityType.service]: EntityIdentifierFields.serviceName,
  [EntityType.generic]: EntityIdentifierFields.generic,
};
