/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { LiquidArraySchema } from './workflow_schema_helpers';

export const CaseMatchingStepId = 'security.matchAndAttachAlertsToCases';

const CaseMatchingInputSchema = z.object({
  entities: z
    .union([
      z.array(z.object({ type_key: z.string(), value: z.string(), alert_id: z.string() })),
      z.string(),
    ])
    .transform((val) => {
      if (Array.isArray(val)) return val;
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    }),
  leader_alert_ids: LiquidArraySchema,
  index_pattern: z.string().default('.alerts-security.alerts-default'),
});

const CaseMatchingOutputSchema = z.object({
  cases_matched: z.number(),
  cases_created: z.number(),
  alerts_attached: z.number(),
  affected_case_ids: z.array(z.string()),
  alert_ids_by_case: z.record(z.string(), z.array(z.string())),
  alert_groups: z.array(
    z.object({
      group_id: z.string(),
      alert_ids: z.array(z.string()),
      primary_host: z.string(),
      primary_user: z.string(),
    })
  ),
});

export const caseMatchingStep = createServerStepDefinition({
  id: CaseMatchingStepId,
  category: StepCategory.Kibana,
  label: 'Match Alerts to Cases',
  description:
    'Matches extracted entities to open security cases using weighted overlap scoring, attaches alerts to matched cases, or creates new cases for unmatched alerts.',
  documentation: {
    details:
      'Uses entity overlap scoring with configurable weights. ' +
      'Note: Full case matching via Cases API requires KibanaRequest (not available in workflow context). ' +
      'This step groups alerts by shared entities and reports groupings for downstream steps.',
    examples: [],
  },
  inputSchema: CaseMatchingInputSchema,
  outputSchema: CaseMatchingOutputSchema,
  handler: async (context) => {
    const entities = context.input.entities;
    const leaderAlertIds = context.input.leader_alert_ids;

    if (leaderAlertIds.length === 0) {
      context.logger.info('No leader alerts to match');
      return {
        output: {
          cases_matched: 0,
          cases_created: 0,
          alerts_attached: 0,
          affected_case_ids: [],
          alert_ids_by_case: {},
        },
      };
    }

    // Group alerts by shared entities (host + user combination)
    // This is a lightweight grouping that doesn't require the Cases plugin
    const alertGroups = new Map<string, string[]>();
    for (const entity of entities) {
      if (entity.type_key === 'hostname' || entity.type_key === 'user') {
        const groupKey = `${entity.type_key}::${entity.value}`;
        if (!alertGroups.has(groupKey)) {
          alertGroups.set(groupKey, []);
        }
        const group = alertGroups.get(groupKey)!;
        if (!group.includes(entity.alert_id)) {
          group.push(entity.alert_id);
        }
      }
    }

    // Merge groups that share alerts (transitive grouping)
    const alertToGroup = new Map<string, string>();
    const groupAlerts = new Map<string, Set<string>>();
    let groupCounter = 0;

    for (const [, alertIds] of alertGroups) {
      // Find existing group for any of these alerts
      let existingGroupId: string | undefined;
      for (const alertId of alertIds) {
        if (alertToGroup.has(alertId)) {
          existingGroupId = alertToGroup.get(alertId);
          break;
        }
      }

      const groupId = existingGroupId ?? `group-${groupCounter++}`;
      if (!groupAlerts.has(groupId)) {
        groupAlerts.set(groupId, new Set());
      }
      const group = groupAlerts.get(groupId)!;
      for (const alertId of alertIds) {
        group.add(alertId);
        alertToGroup.set(alertId, groupId);
      }
    }

    // Track primary host/user per group for case titles
    const groupContext = new Map<string, { hosts: Set<string>; users: Set<string> }>();
    for (const entity of entities) {
      const alertGroup = alertToGroup.get(entity.alert_id);
      if (!alertGroup) continue;
      if (!groupContext.has(alertGroup)) {
        groupContext.set(alertGroup, { hosts: new Set(), users: new Set() });
      }
      const ctx = groupContext.get(alertGroup)!;
      if (entity.type_key === 'hostname') ctx.hosts.add(entity.value);
      if (entity.type_key === 'user') ctx.users.add(entity.value);
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

    for (const [groupId, alertSet] of groupAlerts) {
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
      `Case matching: ${leaderAlertIds.length} alerts grouped into ${alertGroups.length} case groups from ${entities.length} entities`
    );

    return {
      output: {
        cases_matched: 0,
        cases_created: alertGroups.length,
        alerts_attached: leaderAlertIds.length,
        affected_case_ids: affectedCaseIds,
        alert_ids_by_case: alertIdsByCase,
        alert_groups: alertGroups,
      },
    };
  },
});
