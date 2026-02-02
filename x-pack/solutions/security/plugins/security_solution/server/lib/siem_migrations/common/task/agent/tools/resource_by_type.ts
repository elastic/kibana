/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool } from '@langchain/core/tools';
import * as z from '@kbn/zod';
import type { SiemMigrationResourceType } from '../../../../../../../common/siem_migrations/model/common.gen';
import type { SiemMigrationsDataResourcesClient } from '../../../data/siem_migrations_data_resources_client';

const NAME = 'getResourceByType' as const;

const DESCRIPTION = `Retrieves migration resources by their type. Use this tool when translating rules that reference external data sources or dependencies.

WHEN TO USE THIS TOOL:
- When a rule references a lookup table, reference set, or external data source
- When you need to understand the structure or content of referenced resources
- When translating rules that depend on macros or other reusable components

RESOURCE TYPES:
For Splunk migrations:
- "lookup": Lookup tables containing reference data (CSV files, KV store collections)
- "macro": Reusable search macros that expand to SPL queries

For QRadar migrations:
- "lookup": Reference sets containing IPs, domains, usernames, or other data. These are stored with a single olumn named \`value\`. Match the appropriate source field (e.g., event source IP) against this column when translating rules.
- "qidmap": QID mapping information
- "reference_data_rules": Reference data rule definitions
- "sensordevicetype": Sensor device type configurations
- "sensordeviceprotocols": Sensor device protocol mappings
- "sensordevicecategory": Sensor device category definitions
- "ariel_property_expression": Ariel property expressions
- "ariel_regex_property": Ariel regex property definitions
- "reference_data": General reference data
- "offense_type": Offense type configurations

RETURNS:
An array of resources with their names and content. If no resources of the specified type exist, returns an empty array.`;

const SCHEMA = z.object({
  type: z
    .enum([
      // Splunk resource types
      'lookup',
      'macro',
      // QRadar resource types
      'qidmap',
      'reference_data_rules',
      'sensordevicetype',
      'sensordeviceprotocols',
      'sensordevicecategory',
      'ariel_property_expression',
      'ariel_regex_property',
      'reference_data',
      'offense_type',
    ])
    .describe(
      'The type of resource to retrieve. Must be one of the valid resource types for the migration vendor.'
    ),
  names: z
    .array(z.string())
    .describe(
      'A list of names to retrieve of the specified type. Multiple names should be provided if all the resource are of same type'
    ),
});

export const getResourceByTypeGetter =
  (migrationId: string, resourcesClient: SiemMigrationsDataResourcesClient) =>
  async ({ type, names }: { type: SiemMigrationResourceType; names: string[] }) => {
    const response = await resourcesClient.get(migrationId, {
      filters: { type, names },
    });
    return {
      result: response.map((resource) => ({
        name: resource.name,
        content: resource.content,
      })),
    };
  };

export function getResourceByTypeTool(
  migrationId: string,
  resourcesClient: SiemMigrationsDataResourcesClient
) {
  return {
    [NAME]: tool(getResourceByTypeGetter(migrationId, resourcesClient), {
      name: NAME,
      description: DESCRIPTION,
      schema: SCHEMA,
    }),
  };
}
