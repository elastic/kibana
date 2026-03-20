/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostEntity, UserEntity } from '../../../../common/api/entity_analytics';
import type { IdentityFields } from '../../document_details/shared/utils';

/**
 * Maps an entity store v2 user record to ECS-style identifier fields for risk / observed-user queries.
 */
export const getUserIdentityFieldsFromStoreRecord = (record: UserEntity): IdentityFields => {
  const identifiers: IdentityFields = {};
  if (record.entity?.id) {
    identifiers['user.entity.id'] = record.entity.id;
  }
  const user = record.user;
  if (user?.name) {
    identifiers['user.name'] = user.name;
  }
  const userId = user?.id?.[0];
  if (userId) {
    identifiers['user.id'] = userId;
  }
  const email = user?.email?.[0];
  if (email) {
    identifiers['user.email'] = email;
  }
  const domain = user?.domain?.[0];
  if (domain) {
    identifiers['user.domain'] = domain;
  }
  return identifiers;
};

/**
 * Maps an entity store v2 host record to ECS-style identifier fields for risk / observed-host queries.
 */
export const getHostIdentityFieldsFromStoreRecord = (record: HostEntity): IdentityFields => {
  const identifiers: IdentityFields = {};
  const hostEntityId = record.host?.entity?.id ?? record.entity?.id;
  if (hostEntityId) {
    identifiers['host.entity.id'] = hostEntityId;
  }
  const host = record.host;
  if (host?.name) {
    identifiers['host.name'] = host.name;
  }
  const hostId = host?.id?.[0];
  if (hostId) {
    identifiers['host.id'] = hostId;
  }
  const hostname = host?.hostname?.[0];
  if (hostname) {
    identifiers['host.hostname'] = hostname;
  }
  const domain = host?.domain?.[0];
  if (domain) {
    identifiers['host.domain'] = domain;
  }
  const mac = host?.mac?.[0];
  if (mac) {
    identifiers['host.mac'] = mac;
  }
  return identifiers;
};
