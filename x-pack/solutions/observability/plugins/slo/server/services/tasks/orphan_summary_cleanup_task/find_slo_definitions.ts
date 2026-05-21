/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClient } from '@kbn/core/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { StoredSLODefinition } from '../../../domain/models';
import { SO_SLO_TYPE } from '../../../saved_objects';

export interface SLO {
  id: string;
  revision: number;
}

export interface SLODefinitionInfo {
  id: string;
  revision: number;
  enabled: boolean;
}

export type SLOKey = `${SLO['id']}:::${SLO['revision']}`;

export function getKey(item: SLO): SLOKey {
  return `${item.id}:::${item.revision}`;
}

/**
 * Looks up SLO definitions for the given ids and returns them indexed by
 * `${id}:::${revision}`. Callers compare entries by key so revision
 * mismatches show up as orphans, and can read `enabled` to detect disabled
 * SLOs whose transforms should be stopped.
 */
export async function findSloDefinitionMap(
  sloIds: string[],
  { logger, soClient }: { logger: Logger; soClient: SavedObjectsClient }
): Promise<Map<SLOKey, SLODefinitionInfo>> {
  const map = new Map<SLOKey, SLODefinitionInfo>();
  if (sloIds.length === 0) {
    return map;
  }

  const response = await soClient.find<Pick<StoredSLODefinition, 'id' | 'revision' | 'enabled'>>({
    type: SO_SLO_TYPE,
    page: 1,
    perPage: sloIds.length,
    filter: `slo.attributes.id:(${sloIds.join(' or ')})`,
    namespaces: [ALL_SPACES_ID],
    fields: ['id', 'revision', 'enabled'],
  });

  logger.debug(`Found ${response.total} matching SLO definitions for ${sloIds.length} SLO ids`);

  for (const { attributes } of response.saved_objects) {
    map.set(getKey({ id: attributes.id, revision: attributes.revision }), {
      id: attributes.id,
      revision: attributes.revision,
      enabled: attributes.enabled,
    });
  }
  return map;
}
