/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityStorePlugin } from './plugin';

export { useInstallEntityStoreV2 } from './hooks/useInstallEntityStoreV2';

export {
  euid,
  buildEntityFiltersFromEntityIdentifiers,
  buildGenericEntityFlyoutPreviewQuery,
  FF_ENABLE_ENTITY_STORE_V2,
  ALL_ENTITY_TYPES,
} from '../common';
export type { EntityType, IdentitySourceFields } from '../common';

export function plugin() {
  return new EntityStorePlugin();
}
