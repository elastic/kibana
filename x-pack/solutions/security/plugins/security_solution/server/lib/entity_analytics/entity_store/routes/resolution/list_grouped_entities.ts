/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { RESOLUTION_URL } from '../../../../../../common/entity_analytics/entity_store/constants';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { API_VERSIONS } from '../../../../../../common/constants';
import {
  ListGroupedEntitiesRequestParams,
  ListGroupedEntitiesRequestQuery,
  type EntityGroup,
  type GroupedEntity,
} from '../../../../../../common/api/entity_analytics/entity_store/resolution/list_grouped_entities.gen';
import { getEntitiesIndexName } from '../../utils';
import { getResolutionIndexName } from '../../entity_resolution_client';

interface EsqlColumn {
  name: string;
  type: string;
}

interface EsqlResponse {
  columns: EsqlColumn[];
  values: unknown[][];
}

interface EntityRow {
  entityId: string;
  entityName: string;
  entityType: string;
  riskScore: number | null;
  riskLevel: string | null;
  groupId: string;
  isResolved: boolean;
}

export const listGroupedEntities = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'public',
      path: `${RESOLUTION_URL}/{entityType}/grouped`,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(ListGroupedEntitiesRequestParams),
            query: buildRouteValidationWithZod(ListGroupedEntitiesRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        const { entityType } = request.params;
        const { limit = 100 } = request.query;

        try {
          const securityContext = await context.securitySolution;
          const spaceId = securityContext.getSpaceId();
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const type = EntityType[entityType as keyof typeof EntityType];
          const entityIndexName = getEntitiesIndexName(type, spaceId);
          const resolutionIndexName = getResolutionIndexName(type, spaceId);

          // Get the risk field based on entity type
          const riskFieldPrefix = entityType === 'host' ? 'host' : 'user';

          // ES|QL query that:
          // 1. Fetches all entities
          // 2. Joins with resolution index to get resolution_ids
          // 3. Creates a group_id for each entity (resolution_id or synthetic __single_ prefix)
          // 4. Returns individual entity rows with their group info
          const esqlQuery = `
            FROM ${entityIndexName}
            | EVAL entity_id = entity.id
            | LOOKUP JOIN ${resolutionIndexName} ON entity_id
            | EVAL group_id = COALESCE(resolution_id, CONCAT("__single_", entity.id)),
                   is_resolved = resolution_id IS NOT NULL
            | KEEP entity.id, entity.name, entity.type, ${riskFieldPrefix}.risk.calculated_score_norm, ${riskFieldPrefix}.risk.calculated_level, group_id, is_resolved
            | SORT ${riskFieldPrefix}.risk.calculated_score_norm DESC NULLS LAST
            | LIMIT 10000
          `;

          const esqlResult = await esClient.esql.query({
            query: esqlQuery,
            format: 'json',
          });

          const result = esqlResult as unknown as EsqlResponse;

          // Parse ES|QL results into entity rows
          const entityRows: EntityRow[] = result.values
            .filter((row) => row[0] != null && row[5] != null) // Filter out rows with null entity_id or group_id
            .map((row) => ({
              entityId: row[0] as string,
              entityName: row[1] as string,
              entityType: row[2] as string,
              riskScore: row[3] != null ? Number(row[3]) : null,
              riskLevel: row[4] as string | null,
              groupId: row[5] as string,
              isResolved: row[6] as boolean,
            }));

          // Group entities by group_id
          const groupMap = new Map<string, EntityRow[]>();
          for (const entity of entityRows) {
            if (!entity.groupId) continue; // Skip entities without group_id
            if (!groupMap.has(entity.groupId)) {
              groupMap.set(entity.groupId, []);
            }
            groupMap.get(entity.groupId)!.push(entity);
          }

          // Convert to EntityGroup format and calculate max risk scores
          const groups: EntityGroup[] = [];
          for (const [groupId, entities] of groupMap.entries()) {
            const maxRiskEntity = entities.reduce(
              (max, e) => ((e.riskScore ?? 0) > (max.riskScore ?? 0) ? e : max),
              entities[0]
            );

            const isResolved = !groupId.startsWith('__single_');
            const resolutionId = isResolved ? groupId : null;

            const groupedEntities: GroupedEntity[] = entities.map((e) => ({
              id: e.entityId,
              name: e.entityName,
              type: e.entityType,
              risk_score: e.riskScore,
              risk_level: e.riskLevel,
            }));

            groups.push({
              group_id: groupId,
              resolution_id: resolutionId,
              is_resolved: isResolved,
              max_risk_score: maxRiskEntity.riskScore,
              max_risk_level: maxRiskEntity.riskLevel,
              entities: groupedEntities,
            });
          }

          // Sort groups by max risk score descending
          groups.sort((a, b) => (b.max_risk_score ?? 0) - (a.max_risk_score ?? 0));

          // Apply limit to groups (not entities)
          const limitedGroups = groups.slice(0, limit);
          const totalEntities = limitedGroups.reduce((sum, g) => sum + g.entities.length, 0);

          return response.ok({
            body: {
              groups: limitedGroups,
              total_groups: limitedGroups.length,
              total_entities: totalEntities,
            },
          });
        } catch (e) {
          logger.error(`Error listing grouped entities: ${e.message}`);
          return siemResponse.error({
            statusCode: 500,
            body: e.message,
          });
        }
      }
    );
};
