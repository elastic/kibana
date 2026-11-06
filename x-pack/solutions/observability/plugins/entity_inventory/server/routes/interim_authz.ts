/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteSecurity } from '@kbn/core/server';
import { ENTITY_INVENTORY_API_PRIVILEGES } from '../../common/privileges';

/**
 * The authorization every entity inventory route declares until a Kibana feature grants
 * `entity_inventory_read`; until then only `superuser` passes.
 */
// TODO(elastic/observability-dev#6244): revisit once the entityInventory Kibana feature exists.
export const INTERIM_AUTHZ = {
  authz: {
    requiredPrivileges: [ENTITY_INVENTORY_API_PRIVILEGES.read],
  },
} as const satisfies RouteSecurity;
