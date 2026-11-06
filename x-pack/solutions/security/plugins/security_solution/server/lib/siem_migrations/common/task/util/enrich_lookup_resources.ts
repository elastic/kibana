/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { MappingRuntimeField, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { MigrationResources, MigrationResourcesData } from '../retrievers/resource_retriever';
import type { SiemMigrationsDataResourcesClient } from '../../data/siem_migrations_data_resources_client';

export interface EnrichedLookupResourceField {
  path: string;
  type: string;
}

export interface EnrichedLookupResource extends MigrationResourcesData {
  fields?: EnrichedLookupResourceField[];
}

export type EnrichedMigrationResources = Omit<MigrationResources, 'lookup'> & {
  lookup?: EnrichedLookupResource[];
};

export interface EnrichLookupResourcesParams {
  resources: MigrationResources;
  resourcesDataClient: SiemMigrationsDataResourcesClient;
  logger: Logger;
}

/**
 * Enriches the lookup indices with their corresponding runtime mappings from Elasticsearch.
 * */
export const enrichLookupResourcesWithMappings = async ({
  resources,
  resourcesDataClient,
  logger,
}: EnrichLookupResourcesParams): Promise<EnrichedMigrationResources> => {
  const lookups = resources.lookup?.filter(isLookupResource);
  if (!lookups?.length) {
    return resources;
  }

  const lookupIndexNames = Array.from(
    new Set(lookups.map((lookup) => lookup.content).filter((indexName) => indexName !== ''))
  );

  if (!lookupIndexNames.length) {
    return resources;
  }

  try {
    const mappingsByIndex = await resourcesDataClient.getMapping({
      index: lookupIndexNames,
      allow_no_indices: true,
      ignore_unavailable: true,
    });

    return {
      ...resources,
      lookup: lookups.map((lookup) => {
        if (!lookup.content) {
          return lookup;
        }

        const mapping = mappingsByIndex[lookup.content]?.mappings;
        if (!mapping) {
          logger.debug(`No mapping found for lookup index "${lookup.content}"`);
          return lookup;
        }

        return {
          ...lookup,
          fields: getRuntimeMappingFields(mapping),
        };
      }),
    };
  } catch (error) {
    logger.warn(`Failed to enrich lookup resources with runtime mappings: ${error}`);
    return resources;
  }
};

const isLookupResource = (resource: MigrationResourcesData): boolean => resource.type === 'lookup';

export const getRuntimeMappingFields = (
  mapping: MappingTypeMapping
): EnrichedLookupResourceField[] => {
  const runtimeFields = mapping.runtime ?? {};

  return Object.entries(runtimeFields)
    .flatMap(([fieldPath, field]) => getRuntimeFieldEntries(fieldPath, field))
    .sort((fieldA, fieldB) => fieldA.path.localeCompare(fieldB.path));
};

const getRuntimeFieldEntries = (
  fieldPath: string,
  field: MappingRuntimeField
): EnrichedLookupResourceField[] => {
  if (field.type === 'composite' && field.fields) {
    return Object.entries(field.fields).map(([subFieldPath, subField]) => ({
      path: `${fieldPath}.${subFieldPath}`,
      type: subField.type,
    }));
  }

  return [{ path: fieldPath, type: field.type }];
};
