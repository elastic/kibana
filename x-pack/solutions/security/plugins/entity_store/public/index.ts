/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityStorePlugin } from './plugin';

export { useInstallEntityStoreV2 } from './hooks/useInstallEntityStoreV2';
export { EntityStoreEuidApiProvider, useEntityStoreEuidApi } from './euid_api_context';
export type { EntityStoreEuidApi } from './euid_api_context';

export { FF_ENABLE_ENTITY_STORE_V2, ALL_ENTITY_TYPES } from '../common/constants';
export type { EntityType, IdentitySourceFields } from '../common/constants';

/** Load the EUID API (euid, filter builders). Use when you need them; prefer useEntityStoreEuidApi() in React. */
export const loadEuidApi = () =>
  import('./euid_browser').then((m) => ({
    euid: m.euid,
    buildEntityFiltersFromEntityIdentifiers: m.buildEntityFiltersFromEntityIdentifiers,
    buildGenericEntityFlyoutPreviewQuery: m.buildGenericEntityFlyoutPreviewQuery,
  }));

export function plugin() {
  return new EntityStorePlugin();
}
