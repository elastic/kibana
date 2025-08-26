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

// Define a flexible type for entity data from Elasticsearch
interface EntityData {
  entity?: {
    id?: string;
    name?: string;
    type?: string;
    sub_type?: string;
  };
  asset?: {
    criticality?: string;
  };
  cloud?: {
    provider?: string;
    region?: string;
    availability_zone?: string;
    service?: {
      name?: string;
    };
    account?: {
      name?: string;
      id?: string;
    };
    machine?: {
      type?: string;
    };
    instance?: {
      name?: string;
      id?: string;
    };
  };
  host?: {
    id?: string;
    name?: string;
    ip?: string;
    mac?: string;
    architecture?: string;
    type?: string;
    os?: {
      name?: string;
      type?: string;
    };
  };
  user?: {
    id?: string;
    name?: string;
    domain?: string;
    email?: string;
    full_name?: string;
    roles?: string[] | string;
    hash?: string;
  };
  service?: {
    name?: string;
    address?: string;
    environment?: string;
    id?: string;
    node?: string;
    state?: string;
    type?: string;
    ephemeral_id?: string;
  };
  '@timestamp'?: string;
}

const DESCRIPTION =
  'Get information about an asset from the asset inventory (hosts, users, services, etc.)';

// Helper functions to reduce complexity
const formatHostDetails = (entity: EntityData): string => {
  return `

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
};

const formatUserDetails = (entity: EntityData): string => {
  return `

User Details:
- Username: ${entity.user?.name || 'Not available'}
- Domain: ${entity.user?.domain || 'Not available'}
- Email: ${entity.user?.email || 'Not available'}
- Full Name: ${entity.user?.full_name || 'Not available'}
- User ID: ${entity.user?.id || 'Not available'}
- Roles: ${
    Array.isArray(entity.user?.roles)
      ? entity.user.roles.join(', ')
      : entity.user?.roles || 'Not available'
  }
- User Hash: ${entity.user?.hash || 'Not available'}`;
};

const formatServiceDetails = (entity: EntityData): string => {
  return `

Service Details:
- Service Name: ${entity.service?.name || 'Not available'}
- Service Address: ${entity.service?.address || 'Not available'}
- Service Environment: ${entity.service?.environment || 'Not available'}
- Service ID: ${entity.service?.id || 'Not available'}
- Service Node: ${entity.service?.node || 'Not available'}
- Service State: ${entity.service?.state || 'Not available'}
- Service Type: ${entity.service?.type || 'Not available'}
- Ephemeral ID: ${entity.service?.ephemeral_id || 'Not available'}`;
};

const formatHostSummary = (
  entity: EntityData,
  entityType: string,
  entitySubType: string,
  entityId: string,
  location: string
): string => {
  return `

The host ${entity.entity?.name || entityId} is a ${entityType} (${entitySubType}) with ${
    entity.asset?.criticality || 'unassigned'
  } business criticality, located in ${location}, owned by account "${
    entity.cloud?.account?.name || 'unknown'
  }", last seen on ${entity['@timestamp']}.`;
};

const formatUserSummary = (
  entity: EntityData,
  entityType: string,
  entitySubType: string,
  entityId: string
): string => {
  return `

The user ${
    entity.entity?.name || entity.user?.name || entityId
  } is a ${entityType} (${entitySubType}) with ${
    entity.asset?.criticality || 'unassigned'
  } business criticality${
    entity.user?.domain ? ` in domain "${entity.user.domain}"` : ''
  }, associated with account "${entity.cloud?.account?.name || 'unknown'}", last seen on ${
    entity['@timestamp']
  }.`;
};

const formatServiceSummary = (
  entity: EntityData,
  entityType: string,
  entitySubType: string,
  entityId: string
): string => {
  return `

The service ${
    entity.entity?.name || entity.service?.name || entityId
  } is a ${entityType} (${entitySubType}) with ${
    entity.asset?.criticality || 'unassigned'
  } business criticality, running in ${
    entity.service?.environment || 'unknown environment'
  } state: ${entity.service?.state || 'unknown'}, associated with account "${
    entity.cloud?.account?.name || 'unknown'
  }", last seen on ${entity['@timestamp']}.`;
};

const formatGenericSummary = (
  entity: EntityData,
  entityType: string,
  entitySubType: string,
  entityId: string,
  location: string
): string => {
  return `

The ${entityType.toLowerCase()} ${
    entity.entity?.name || entityId
  } is a ${entityType} (${entitySubType}) with ${
    entity.asset?.criticality || 'unassigned'
  } business criticality, running ${
    entity.cloud?.service?.name || 'unknown service'
  } in ${location}, owned by account "${entity.cloud?.account?.name || 'unknown'}", last seen on ${
    entity['@timestamp']
  }.`;
};

const formatSummary = (
  entity: EntityData,
  entityType: string,
  entitySubType: string,
  entityId: string,
  location: string
): string => {
  if (entityType === 'Host') {
    return formatHostSummary(entity, entityType, entitySubType, entityId, location);
  } else if (entityType === 'User' || entity.user?.name) {
    return formatUserSummary(entity, entityType, entitySubType, entityId);
  } else if (entityType === 'Service' || entity.service?.name) {
    return formatServiceSummary(entity, entityType, entitySubType, entityId);
  } else {
    return formatGenericSummary(entity, entityType, entitySubType, entityId, location);
  }
};

const buildSearchQuery = (entityId: string) => ({
  index: '.entities.v1.latest.security_*',
  query: {
    bool: {
      should: [
        { match: { 'entity.name': entityId } },
        { match: { 'host.name': entityId } },
        { match: { 'entity.id': entityId } },
        { match: { 'user.name': entityId } },
        { match: { 'service.name': entityId } },
      ],
    },
  },
  size: 1,
});

const buildAssetMessage = (entity: EntityData, entityId: string): string => {
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

  // Add type-specific information using helper functions
  if (entityType === 'Host') {
    message += formatHostDetails(entity);
  } else if (entityType === 'User' || entity.user?.name) {
    message += formatUserDetails(entity);
  } else if (entityType === 'Service' || entity.service?.name) {
    message += formatServiceDetails(entity);
  }

  // Add summary based on entity type
  const location = entity.cloud?.provider
    ? `${entity.cloud.provider} ${entity.cloud.region || 'unknown region'}`
    : 'unknown location';

  message += formatSummary(entity, entityType, entitySubType, entityId, location);

  return message;
};

const simpleSchema = z.object({
  entityId: z
    .string()
    .describe(
      'Asset identifier to look up (host name, user name, service name, entity ID, or ARN)'
    ),
});

export const ASSET_INVENTORY_TOOL: AssistantTool = {
  id: 'asset_inventory',
  name: 'AssetInventory',
  description: DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams) => {
    params.logger?.debug('🔧 AssetInventorySimple isSupported check');
    return params.esClient != null;
  },
  async getTool(params: AssistantToolParams) {
    params.logger?.debug('🔧 AssetInventorySimple getTool called');

    return tool(
      async ({ entityId }) => {
        const { esClient, logger } = params;

        logger?.debug(`🔍 SIMPLE ASSET TOOL CALLED: ${entityId}`);

        try {
          const query = buildSearchQuery(entityId);

          logger?.debug('🔍 Running simple query');
          const result = await esClient.search(query);
          logger?.debug(`🔍 Simple query found ${result.hits.hits.length} results`);

          if (result.hits.hits.length === 0) {
            return `No entity found with ID: ${entityId}. Please verify the entity ID is correct.`;
          }

          const entity = result.hits.hits[0]._source as EntityData;
          logger?.debug('🔍 Entity data retrieved');

          const message = buildAssetMessage(entity, entityId);

          logger?.debug('🔍 Simple tool returning response');
          return message;
        } catch (error) {
          logger?.error('🚨 Simple tool error', error);
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
