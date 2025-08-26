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
                  { match: { 'entity.id': entityId } },
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
          const entityType = entity.entity?.type || 'unknown';
          const entitySubType = entity.entity?.sub_type || 'unknown subtype';
          
          let message = `Asset Information:
- Entity ID: ${entity.entity?.id || 'Not available'}
- Name: ${entity.entity?.name || entityId}
- Type: ${entityType} (${entitySubType})
- Criticality: ${entity.asset?.criticality || 'unassigned'}
- Last Seen: ${entity['@timestamp'] || 'unknown'}

Cloud & Account:
- Cloud Provider: ${entity.cloud?.provider || 'Not available'}
- Region: ${entity.cloud?.region || 'Not available'}
- Service: ${entity.cloud?.service?.name || 'Not available'}
- Account Name: ${entity.cloud?.account?.name || 'Not available'}
- Account ID: ${entity.cloud?.account?.id || 'Not available'}`;

          // Add Host-specific information
          if (entityType === 'Host') {
            message += `

Host Details:
- Availability Zone: ${entity.cloud?.availability_zone || 'Not available'}
- Architecture: ${entity.host?.architecture || 'Not available'}
- Machine Type: ${entity.cloud?.machine?.type || 'Not available'}
- Instance Name: ${entity.cloud?.instance?.name || 'Not available'}

Operating System:
- OS Name: ${entity.host?.os?.name || 'Not available'}
- OS Type: ${entity.host?.os?.type || 'Not available'}

Network:
- Host ID: ${entity.host?.id || 'Not available'}
- IP Address: ${entity.host?.ip || 'Not available'}
- MAC Address: ${entity.host?.mac || 'Not available'}`;
          }

          // Add summary based on entity type
          const location = entity.cloud?.provider 
            ? `${entity.cloud.provider} ${entity.cloud.region || 'unknown region'}` 
            : 'unknown location';
            
          if (entityType === 'Host') {
            message += `

The host ${entity.entity?.name || entityId} is a ${entityType} (${entitySubType}) with ${
              entity.asset?.criticality || 'unassigned'
            } business criticality, located in ${location}, owned by account "${entity.cloud?.account?.name || 'unknown'}", last seen on ${entity['@timestamp']}.`;
          } else {
            message += `

The ${entityType.toLowerCase()} ${entity.entity?.name || entityId} is a ${entityType} (${entitySubType}) with ${
              entity.asset?.criticality || 'unassigned'
            } business criticality, running ${entity.cloud?.service?.name || 'unknown service'} in ${location}, owned by account "${entity.cloud?.account?.name || 'unknown'}", last seen on ${entity['@timestamp']}.`;
          }

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
