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
- Entity ID: ${entity.entity?.id || 'Not available'}
- Name: ${entity.entity?.name || entityId}
- Type: ${entity.entity?.type || 'unknown'} (${entity.entity?.sub_type || 'unknown subtype'})
- Criticality: ${entity.asset?.criticality || 'unassigned'}
- Last Seen: ${entity['@timestamp'] || 'unknown'}

Location & Infrastructure:
- Cloud Provider: ${entity.cloud?.provider || 'Not available'}
- Region: ${entity.cloud?.region || 'Not available'}
- Availability Zone: ${entity.cloud?.availability_zone || 'Not available'}
- Architecture: ${entity.host?.architecture || 'Not available'}
- Machine Type: ${entity.cloud?.machine?.type || 'Not available'}

Operating System:
- OS Name: ${entity.host?.os?.name || 'Not available'}
- OS Type: ${entity.host?.os?.type || 'Not available'}

Ownership & Account:
- Account Name: ${entity.cloud?.account?.name || 'Not available'}
- Account ID: ${entity.cloud?.account?.id || 'Not available'}
- Instance Name: ${entity.cloud?.instance?.name || 'Not available'}

Network:
- Host ID: ${entity.host?.id || 'Not available'}
- IP Address: ${entity.host?.ip || 'Not available'}
- MAC Address: ${entity.host?.mac || 'Not available'}

The host ${entity.entity?.name || entityId} is a ${entity.entity?.type || 'unknown'} with ${
            entity.asset?.criticality || 'unassigned'
          } business criticality, located in ${entity.cloud?.provider || 'unknown'} ${entity.cloud?.region || 'unknown region'}, owned by account "${entity.cloud?.account?.name || 'unknown'}", last seen on ${entity['@timestamp']}.`;

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
