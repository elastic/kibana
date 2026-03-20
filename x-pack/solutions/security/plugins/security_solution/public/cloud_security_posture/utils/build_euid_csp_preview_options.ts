/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseCspOptions } from '@kbn/cloud-security-posture-common/types/findings';
import type { EntityStoreEuidApi, EntityType } from '@kbn/entity-store/public';

/**
 * Picks host / user / service / generic from flattened identity field keys for CSP/EUID queries.
 */
export const inferEntityTypeFromIdentityFields = (
  fields: Record<string, string | undefined>
): EntityType => {
  for (const key of Object.keys(fields)) {
    if (key.startsWith('user.')) {
      return 'user';
    }
    if (key.startsWith('host.')) {
      return 'host';
    }
    if (key.startsWith('service.')) {
      return 'service';
    }
  }
  return 'generic';
};

const disabledCspPreviewOptions: UseCspOptions = {
  query: { bool: { filter: [] } },
  sort: [],
  enabled: false,
  pageSize: 1,
};

/**
 * Builds {@link UseCspOptions} for CSP preview hooks from entity-store EUID filters.
 */
export const buildEuidCspPreviewOptions = (
  entityType: EntityType,
  identityDocument: unknown,
  euidApi: EntityStoreEuidApi | null
): UseCspOptions => {
  if (!euidApi?.euid) {
    return disabledCspPreviewOptions;
  }

  const euidEntityFilter = euidApi.euid.getEuidDslFilterBasedOnDocument(
    entityType,
    identityDocument
  );

  if (euidEntityFilter == null) {
    return disabledCspPreviewOptions;
  }

  return {
    query: { bool: { filter: [euidEntityFilter] } },
    sort: [],
    enabled: true,
    pageSize: 1,
  };
};
