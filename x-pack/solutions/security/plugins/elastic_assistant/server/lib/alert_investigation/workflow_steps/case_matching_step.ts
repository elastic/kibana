/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { extractEntitiesFromAlerts } from '../entity_extraction';
import { fetchAlertsByIds, adaptWorkflowLogger } from '../utils';
import { LiquidArraySchema } from './workflow_schema_helpers';

export const CaseMatchingStepId = 'security.matchAndAttachAlertsToCases';

const CaseMatchingInputSchema = z.object({
  leader_alert_ids: LiquidArraySchema,
  index_pattern: z.string().default('.alerts-security.alerts-default'),
});

const CaseMatchingOutputSchema = z.object({
  cases_created: z.number(),
  alerts_grouped: z.number(),
  affected_case_ids: z.array(z.string()),
  alert_ids_by_case: z.record(z.string(), z.array(z.string())),
  // alert_groups as native array for forEach consumption
  alert_groups: z.array(
    z.object({
      group_id: z.string(),
      alert_ids: z.array(z.string()),
      primary_host: z.string(),
      primary_user: z.string(),
    })
  ),
  // Same data as JSON string — workaround if forEach can't resolve complex arrays
  alert_groups_json: z.string(),
});

export const caseMatchingStep = createServerStepDefinition({
  id: CaseMatchingStepId,
  category: StepCategory.Kibana,
  label: 'Match Alerts to Cases',
  description:
    'Groups alerts by shared entities (host, user) and outputs alert_groups for forEach case creation.',
  documentation: {
    details:
      'Fetches alerts by ID, extracts entities, groups by host+user overlap. ' +
      'Outputs alert_groups array for use with forEach to create one case per group.',
    examples: [],
  },
  inputSchema: CaseMatchingInputSchema,
  outputSchema: CaseMatchingOutputSchema,
  handler: async (context) => {
    const esClient = context.contextManager.getScopedEsClient();
    const logger = adaptWorkflowLogger(context.logger);
    const { leader_alert_ids: leaderAlertIds, index_pattern: indexPattern } = context.input;

    const emptyOutput = {
      output: {
        cases_created: 0,
        alerts_grouped: 0,
        affected_case_ids: [] as string[],
        alert_ids_by_case: {} as Record<string, string[]>,
        alert_groups: [] as Array<{
          group_id: string;
          alert_ids: string[];
          primary_host: string;
          primary_user: string;
        }>,
      },
    };

    if (leaderAlertIds.length === 0) {
      context.logger.info('No leader alerts to match');
      return emptyOutput;
    }

    // Fetch alerts and extract entities directly (avoids liquid template serialization issues)
    const alerts = await fetchAlertsByIds({
      esClient,
      indexPattern,
      alertIds: leaderAlertIds,
      logger,
    });

    if (alerts.length === 0) {
      context.logger.warn('No alerts found for the given IDs');
      return emptyOutput;
    }

    const extractionResult = extractEntitiesFromAlerts({ alerts, logger });

    context.logger.info(
      `Extracted ${extractionResult.entities.length} entities from ${alerts.length} alerts`
    );

    // Group alerts by shared entities (host + user)
    const entityAlertMap = new Map<string, string[]>();
    for (const entity of extractionResult.entities) {
      if (entity.typeKey === 'hostname' || entity.typeKey === 'user') {
        const groupKey = `${entity.typeKey}::${entity.value}`;
        if (!entityAlertMap.has(groupKey)) {
          entityAlertMap.set(groupKey, []);
        }
        const group = entityAlertMap.get(groupKey)!;
        if (!group.includes(entity.alertId)) {
          group.push(entity.alertId);
        }
      }
    }

    // Merge groups that share alerts (transitive grouping)
    const alertToGroup = new Map<string, string>();
    const groupAlertSets = new Map<string, Set<string>>();
    let groupCounter = 0;

    for (const [, alertIds] of entityAlertMap) {
      let existingGroupId: string | undefined;
      for (const alertId of alertIds) {
        if (alertToGroup.has(alertId)) {
          existingGroupId = alertToGroup.get(alertId);
          break;
        }
      }

      const groupId = existingGroupId ?? `group-${groupCounter++}`;
      if (!groupAlertSets.has(groupId)) {
        groupAlertSets.set(groupId, new Set());
      }
      const group = groupAlertSets.get(groupId)!;
      for (const alertId of alertIds) {
        group.add(alertId);
        alertToGroup.set(alertId, groupId);
      }
    }

    // Track primary host/user per group for case titles
    const groupContext = new Map<string, { hosts: Set<string>; users: Set<string> }>();
    for (const entity of extractionResult.entities) {
      const alertGroup = alertToGroup.get(entity.alertId);
      if (!alertGroup) continue;
      if (!groupContext.has(alertGroup)) {
        groupContext.set(alertGroup, { hosts: new Set(), users: new Set() });
      }
      const ctx = groupContext.get(alertGroup)!;
      if (entity.typeKey === 'hostname') ctx.hosts.add(entity.value);
      if (entity.typeKey === 'user') ctx.users.add(entity.value);
    }

    // Build outputs
    const alertIdsByCase: Record<string, string[]> = {};
    const affectedCaseIds: string[] = [];
    const alertGroups: Array<{
      group_id: string;
      alert_ids: string[];
      primary_host: string;
      primary_user: string;
    }> = [];

    for (const [groupId, alertSet] of groupAlertSets) {
      if (alertSet.size > 0) {
        const ids = [...alertSet];
        alertIdsByCase[groupId] = ids;
        affectedCaseIds.push(groupId);

        const ctx = groupContext.get(groupId);
        alertGroups.push({
          group_id: groupId,
          alert_ids: ids,
          primary_host: ctx?.hosts.values().next().value ?? 'unknown',
          primary_user: ctx?.users.values().next().value ?? 'unknown',
        });
      }
    }

    context.logger.info(
      `Case matching: ${alerts.length} alerts grouped into ${alertGroups.length} case groups`
    );

    return {
      output: {
        cases_created: alertGroups.length,
        alerts_grouped: leaderAlertIds.length,
        affected_case_ids: affectedCaseIds,
        alert_ids_by_case: alertIdsByCase,
        alert_groups: alertGroups,
        alert_groups_json: JSON.stringify(alertGroups),
      },
    };
  },
});
