/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';

/**
 * Normalizes attack discovery objects that may arrive with snake_case keys
 * (from workflow execution output) to the camelCase format expected by
 * `generateAttackDiscoveryAlertHash`, `getAttackDiscoveryMarkdownFields`,
 * and `transformToBaseAlertDocument`.
 */
export const normalizeAttackDiscovery = (raw: unknown): AttackDiscovery => {
  const d = raw as Record<string, unknown>;

  return {
    alertIds: (d.alertIds ?? d.alert_ids ?? []) as string[],
    detailsMarkdown: (d.detailsMarkdown ?? d.details_markdown ?? '') as string,
    entitySummaryMarkdown: (d.entitySummaryMarkdown ?? d.entity_summary_markdown) as
      | string
      | undefined,
    id: d.id as string | undefined,
    mitreAttackTactics: (d.mitreAttackTactics ?? d.mitre_attack_tactics) as string[] | undefined,
    summaryMarkdown: (d.summaryMarkdown ?? d.summary_markdown ?? '') as string,
    timestamp: (d.timestamp ?? '') as string,
    title: (d.title ?? '') as string,
  } as AttackDiscovery;
};
