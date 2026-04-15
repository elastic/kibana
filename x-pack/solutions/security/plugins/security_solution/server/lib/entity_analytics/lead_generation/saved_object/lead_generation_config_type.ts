/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsClientContract, SavedObjectsType } from '@kbn/core/server';

export const leadGenerationConfigTypeName = 'lead-generation-config';

export const leadGenerationConfigTypeMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    connectorId: { type: 'keyword' },
    lastExecutionUuid: { type: 'keyword' },
    lastError: { type: 'text' },
  },
};

const version1: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        connectorId: { type: 'keyword' },
        lastExecutionUuid: { type: 'keyword' },
        lastError: { type: 'text' },
      },
    },
  ],
};

export const leadGenerationConfigType: SavedObjectsType = {
  name: leadGenerationConfigTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: leadGenerationConfigTypeMappings,
  modelVersions: { 1: version1 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export interface LeadGenerationConfigAttributes {
  connectorId: string;
  lastExecutionUuid?: string;
  lastError?: string | null;
}

const getConfigId = (namespace: string): string => `lead-generation-config-${namespace}`;

export const getLeadGenerationConfig = async (
  soClient: SavedObjectsClientContract,
  namespace: string
): Promise<LeadGenerationConfigAttributes | null> => {
  try {
    const so = await soClient.get<LeadGenerationConfigAttributes>(
      leadGenerationConfigTypeName,
      getConfigId(namespace)
    );
    return so.attributes;
  } catch {
    return null;
  }
};

export const upsertLeadGenerationConfig = async (
  soClient: SavedObjectsClientContract,
  namespace: string,
  attrs: LeadGenerationConfigAttributes
): Promise<void> => {
  await soClient.create<LeadGenerationConfigAttributes>(leadGenerationConfigTypeName, attrs, {
    id: getConfigId(namespace),
    overwrite: true,
  });
};
