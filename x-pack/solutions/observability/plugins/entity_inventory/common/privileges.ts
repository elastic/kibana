/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * API privileges the entity inventory routes require. No Kibana feature grants them yet, so only
 * `superuser` passes and every other role gets 403.
 */
// TODO(elastic/observability-dev#6244): register an entityInventory Kibana feature that grants this privilege.
export const ENTITY_INVENTORY_API_PRIVILEGES = {
  read: 'entity_inventory_read',
} as const;
