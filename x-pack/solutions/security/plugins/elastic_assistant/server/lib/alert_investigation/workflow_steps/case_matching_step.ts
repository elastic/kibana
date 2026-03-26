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
import { LiquidArraySchema, parseArrayInput } from './workflow_schema_helpers';

export const CaseMatchingStepId = 'security.matchAndAttachAlertsToCases';

const CaseMatchingInputSchema = z.object({
  leader_alert_ids: LiquidArraySchema,
  index_pattern: z.string().default('.alerts-security.alerts-default'),
});

const AlertGroupSchema = z.object({
  group_id: z.string(),
  alert_ids: z.array(z.string()),
  primary_host: z.string(),
  primary_user: z.string(),
  existing_case_id: z.string().optional(),
});

const CaseMatchingOutputSchema = z.object({
  cases_created: z.number(),
  alerts_grouped: z.number(),
  new_groups: z.array(AlertGroupSchema),
  existing_groups: z.array(AlertGroupSchema),
  alert_groups: z.array(AlertGroupSchema),
  alert_groups_json: z.string(),
});

export const caseMatchingStep = createServerStepDefinition({
  id: CaseMatchingStepId,
  category: StepCategory.Kibana,
  label: 'Match Alerts to Cases',
  description:
    'Groups alerts by shared entities and matches against existing cases. ' +
    'Outputs new_groups (need case creation) and existing_groups (attach to existing case).',
  documentation: {
    details:
      'Searches for existing cases tagged alert-investigation-pipeline with matching host/user titles. ' +
      'Alerts matching an existing case go to existing_groups with existing_case_id set.',
    examples: [],
  },
  inputSchema: CaseMatchingInputSchema,
  outputSchema: CaseMatchingOutputSchema,
  handler: async (context) => {
    const esClient = context.contextManager.getScopedEsClient();
    const logger = adaptWorkflowLogger(context.logger);
    const { index_pattern: indexPattern } = context.input;
    const leaderAlertIds = parseArrayInput(context.input.leader_alert_ids);

    type AlertGroup = z.infer<typeof AlertGroupSchema>;

    const emptyOutput = {
      output: {
        cases_created: 0,
        alerts_grouped: 0,
        new_groups: [] as AlertGroup[],
        existing_groups: [] as AlertGroup[],
        alert_groups: [] as AlertGroup[],
        alert_groups_json: '[]',
      },
    };

    if (leaderAlertIds.length === 0) {
      context.logger.info('No leader alerts to match');
      return emptyOutput;
    }

    // Fetch alerts and extract entities
    const alerts = await fetchAlertsByIds({ esClient, indexPattern, alertIds: leaderAlertIds, logger });
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

    // Track primary host/user per group
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

    // Search for existing cases tagged with alert-investigation-pipeline
    // Case titles follow pattern: "Investigation - {host} / {user}"
    let existingCases: Array<{ id: string; title: string }> = [];
    try {
      const fakeRequest = context.contextManager.getFakeRequest();
      const kibanaUrl = context.contextManager.getContext()?.kibanaUrl ?? 'http://localhost:5601';
      const headers: Record<string, string> = { 'kbn-xsrf': 'true' };
      if (fakeRequest.headers.authorization) {
        headers.Authorization = fakeRequest.headers.authorization as string;
      }

      const casesResponse = await fetch(
        `${kibanaUrl}/api/cases/_find?tags=alert-investigation-pipeline&perPage=100&sortOrder=desc&status=open`,
        { headers }
      );

      if (casesResponse.ok) {
        const casesData = await casesResponse.json();
        existingCases = (casesData.cases ?? []).map((c: { id: string; title: string }) => ({
          id: c.id,
          title: c.title,
        }));
        context.logger.info(`Found ${existingCases.length} existing pipeline cases`);
      }
    } catch (err) {
      context.logger.warn(`Could not query existing cases: ${err instanceof Error ? err.message : err}`);
    }

    // Build alert groups and match to existing cases
    const newGroups: AlertGroup[] = [];
    const existingGroups: AlertGroup[] = [];
    const allGroups: AlertGroup[] = [];

    for (const [groupId, alertSet] of groupAlertSets) {
      if (alertSet.size === 0) continue;

      const ids = [...alertSet];
      const ctx = groupContext.get(groupId);
      const primaryHost = ctx?.hosts.values().next().value ?? 'unknown';
      const primaryUser = ctx?.users.values().next().value ?? 'unknown';

      // Try to match to existing case by title pattern
      const expectedTitle = `Investigation - ${primaryHost} / ${primaryUser}`;
      const matchedCase = existingCases.find(
        (c) => c.title.toLowerCase() === expectedTitle.toLowerCase()
      );

      const group: AlertGroup = {
        group_id: groupId,
        alert_ids: ids,
        primary_host: primaryHost,
        primary_user: primaryUser,
        existing_case_id: matchedCase?.id,
      };

      allGroups.push(group);
      if (matchedCase) {
        existingGroups.push(group);
        context.logger.info(
          `Matched ${ids.length} alerts to existing case ${matchedCase.id} (${expectedTitle})`
        );
      } else {
        newGroups.push(group);
      }
    }

    context.logger.info(
      `Case matching: ${alerts.length} alerts → ${allGroups.length} groups (${newGroups.length} new, ${existingGroups.length} existing)`
    );

    return {
      output: {
        cases_created: newGroups.length,
        alerts_grouped: leaderAlertIds.length,
        new_groups: newGroups,
        existing_groups: existingGroups,
        alert_groups: allGroups,
        alert_groups_json: JSON.stringify(allGroups),
      },
    };
  },
});
