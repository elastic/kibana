/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsClientContract, SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

export const leadGenerationConfigTypeName = 'lead-generation-config';

export const leadGenerationConfigTypeMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {},
};

const leadGenerationConfigSchemaV1 = schema.object({
  connectorId: schema.string(),
  lastExecutionUuid: schema.maybe(schema.string()),
  lastError: schema.maybe(schema.nullable(schema.string())),
});

const version1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    forwardCompatibility: leadGenerationConfigSchemaV1.extends({}, { unknowns: 'ignore' }),
    create: leadGenerationConfigSchemaV1,
  },
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

export const updateLeadGenerationConfig = async (
  soClient: SavedObjectsClientContract,
  namespace: string,
  attrs: Partial<LeadGenerationConfigAttributes>
): Promise<void> => {
  await soClient.update<LeadGenerationConfigAttributes>(
    leadGenerationConfigTypeName,
    getConfigId(namespace),
    attrs
  );
};
