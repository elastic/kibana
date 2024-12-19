/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum RiskScoreEntityType {
  host = 'host',
  user = 'user',
  service = 'service',
}

export enum EntityIdentifierFields {
  hostName = 'host.name',
  userName = 'user.name',
  serviceName = 'service.name',
}

export const EntityTypeToNameField: Record<RiskScoreEntityType, EntityIdentifierFields> = {
  [RiskScoreEntityType.host]: EntityIdentifierFields.hostName,
  [RiskScoreEntityType.user]: EntityIdentifierFields.userName,
  [RiskScoreEntityType.service]: EntityIdentifierFields.serviceName,
};
