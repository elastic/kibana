/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentName } from '@kbn/elastic-agent-utils';
import type { InventoryEntity } from '../entities';

interface BuiltinEntityMap {
  host: InventoryEntity & { cloud?: { provider?: string[] } };
  container: InventoryEntity & { cloud?: { provider?: string[] } };
  service: InventoryEntity & {
    agent?: { name: AgentName[] };
    service?: { environment?: string | string[] | null };
  };
}

export const isBuiltinEntityOfType = <T extends keyof BuiltinEntityMap>(
  type: T,
  entity: InventoryEntity
): entity is BuiltinEntityMap[T] => {
  return entity.entityType === type;
};
