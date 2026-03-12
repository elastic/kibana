/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseCspOptions } from '@kbn/cloud-security-posture-common/types/findings';

/** API shape needed (from useEntityStoreEuidApi()). */
export type EntityFlyoutPreviewApi = {
  buildGenericEntityFlyoutPreviewQuery: (
    entityIdentifiers: Record<string, string>,
    status?: string,
    queryField?: string
  ) => { bool: { filter: unknown[] } };
};

/**
 * Builds CSP preview options for useHasMisconfigurations and useHasVulnerabilities
 * by applying entity-store EUID logic to entity identifiers.
 * Pass api from useEntityStoreEuidApi(); when null, returns options with enabled: false.
 */
export const buildEntityFlyoutPreviewCspOptions = (
  entityIdentifiers: Record<string, string>,
  api?: EntityFlyoutPreviewApi | null
): UseCspOptions =>
  api
    ? {
        query: api.buildGenericEntityFlyoutPreviewQuery(entityIdentifiers),
        sort: [],
        enabled: true,
        pageSize: 1,
      }
    : { query: { bool: { filter: [] } }, sort: [], enabled: false, pageSize: 1 };
