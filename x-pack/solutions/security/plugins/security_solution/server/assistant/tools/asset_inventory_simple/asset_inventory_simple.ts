/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { tool } from '@langchain/core/tools';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { APP_UI_ID } from '../../../../common';

const DESCRIPTION = 'Get information about a host or entity from the asset inventory';

const simpleSchema = z.object({
  entityId: z.string().describe('Host name or entity ID to look up'),
});

export const ASSET_INVENTORY_TOOL: AssistantTool = {
  id: 'asset_inventory',
  name: 'AssetInventory',
  description: DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams) => {
    console.log('🔧 AssetInventorySimple isSupported check:', params.esClient != null);
    return params.esClient != null;
  },
  async getTool(params: AssistantToolParams) {
    console.log('🔧 AssetInventorySimple getTool called');

    return tool(
      async ({ entityId }) => {
        console.log(`🔍 SIMPLE ASSET TOOL CALLED: entityId=${entityId}`);

        const { esClient, logger } = params;

        try {
          // Simple query
          const query = {
            index: '.entities.v1.latest.security_*',
            query: {
              bool: {
                should: [
                  { match: { 'entity.name': entityId } },
                  { match: { 'host.name': entityId } },
                ],
              },
            },
            size: 1,
          };

          console.log('🔍 Running simple query...');
          const result = await esClient.search(query);
          console.log(`🔍 Simple query found ${result.hits.hits.length} results`);

          if (result.hits.hits.length === 0) {
            return `No entity found with ID: ${entityId}. Please verify the entity ID is correct.`;
          }

          const entity = result.hits.hits[0]._source as any;
          console.log('🔍 Entity data:', entity);

          // Return simple text that's easier for AI to process
          const message = `Asset Information:
- Entity ID: ${entity.entity?.id || 'N/A'}
- Name: ${entity.entity?.name || entityId}
- Type: ${entity.entity?.type || 'unknown'}
- Criticality: ${entity.asset?.criticality || 'unassigned'}
- Last Seen: ${entity['@timestamp'] || 'unknown'}
- Cloud Provider: ${entity.cloud?.provider || 'N/A'}
- Region: ${entity.cloud?.region || 'N/A'}
- Architecture: ${entity.host?.architecture || 'N/A'}

The host ${entity.entity?.name || entityId} is a ${entity.entity?.type || 'unknown'} with ${
            entity.asset?.criticality || 'unassigned'
          } business criticality, last seen on ${entity['@timestamp']}.`;

          console.log('🔍 Simple tool returning:', message);
          return message;
        } catch (error) {
          console.error('🚨 Simple tool error:', error);
          return `Error looking up entity ${entityId}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`;
        }
      },
      {
        name: 'AssetInventory',
        description: DESCRIPTION,
        schema: simpleSchema,
      }
    );
  },
};
