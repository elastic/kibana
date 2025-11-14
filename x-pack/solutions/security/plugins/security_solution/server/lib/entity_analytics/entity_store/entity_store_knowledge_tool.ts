/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';

const entityStoreKnowledgeSchema = z.object({
  question: z.string().describe('The question about Entity Store entities'),
});

export const ENTITY_STORE_KNOWLEDGE_TOOL_ID = 'entity-store-knowledge-tool';

export const entityStoreKnowledgeTool =
  (): BuiltinToolDefinition<typeof entityStoreKnowledgeSchema> => {
    return {
      id: ENTITY_STORE_KNOWLEDGE_TOOL_ID,
      type: ToolType.builtin,
      description: `Get knowledge about querying Entity Store data. Use this tool when you need information about how to query entity risk scores, entity attributes, or entity relationships from the Entity Store.`,
      schema: entityStoreKnowledgeSchema,
      handler: async ({ question }, { logger }) => {
        logger.debug(`Entity Store knowledge tool called with question: ${question}`);

        const knowledge = `
Entity Store Index Patterns and Data Structure:

The Entity Store contains aggregated information about entities (users, hosts, services) in Elasticsearch.

**Index Patterns:**
- Latest entities: .entities.v1.latest.*
- All entities: .entities.*
- Historical data: .entities.*history*

**Concrete Index Names (examples):**
- .entities.v1.latest.security_user_default (user entities)
- .entities.v1.latest.security_host_default (host entities)
- .entities.v1.latest.security_service_default (service entities)

**CRITICAL - Risk Score Fields:**
Risk scores are stored in ENTITY-TYPE-SPECIFIC fields, NOT in generic entity.risk fields!

For HOSTS:
- host.risk.calculated_score_norm: Normalized risk score (0-100)
- host.risk.calculated_level: Risk level (Low, Moderate, High, Critical)

For USERS:
- user.risk.calculated_score_norm: Normalized risk score (0-100)
- user.risk.calculated_level: Risk level (Low, Moderate, High, Critical)

For SERVICES:
- service.risk.calculated_score_norm: Normalized risk score (0-100)
- service.risk.calculated_level: Risk level (Low, Moderate, High, Critical)

Other Key Fields:
- entity.id: Unique entity identifier
- host.name: Host entity name
- user.name: User entity name
- service.name: Service entity name
- @timestamp: Timestamp of the entity record

**IMPORTANT - How to Query Entity Store:**
1. Use the concrete index name directly (NOT wildcard patterns)
2. ALWAYS filter for non-null risk scores: WHERE host.risk.calculated_score_norm IS NOT NULL
3. Not all entities have risk scores - only filter for those that do

The search tool cannot work with wildcard patterns like .entities.v1.latest.* - you must use concrete index names.

**Query Workflow for Risk Scores:**

For HOSTS with risk scores:
1. Use index: ".entities.v1.latest.security_host_default"
2. Filter: WHERE host.risk.calculated_score_norm IS NOT NULL
3. Sort: SORT host.risk.calculated_score_norm DESC
4. Select fields: host.name, host.risk.calculated_score_norm, host.risk.calculated_level

For USERS with risk scores:
1. Use index: ".entities.v1.latest.security_user_default"
2. Filter: WHERE user.risk.calculated_score_norm IS NOT NULL
3. Sort: SORT user.risk.calculated_score_norm DESC
4. Select fields: user.name, user.risk.calculated_score_norm, user.risk.calculated_level

For SERVICES with risk scores:
1. Use index: ".entities.v1.latest.security_service_default"
2. Filter: WHERE service.risk.calculated_score_norm IS NOT NULL
3. Sort: SORT service.risk.calculated_score_norm DESC
4. Select fields: service.name, service.risk.calculated_score_norm, service.risk.calculated_level

**Example ES|QL Query for Hosts with Highest Risk Scores:**
FROM .entities.v1.latest.security_host_default
| WHERE host.risk.calculated_score_norm IS NOT NULL
| SORT host.risk.calculated_score_norm DESC
| KEEP host.name, host.risk.calculated_score_norm, host.risk.calculated_level
| LIMIT 10

**Example ES|QL Query for Users with Highest Risk Scores:**
FROM .entities.v1.latest.security_user_default
| WHERE user.risk.calculated_score_norm IS NOT NULL
| SORT user.risk.calculated_score_norm DESC
| KEEP user.name, user.risk.calculated_score_norm, user.risk.calculated_level
| LIMIT 10
`;

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                knowledge,
              },
            },
          ],
        };
      },
      tags: ['entity-store', 'entity-analytics', 'risk-score'],
    };
  };
