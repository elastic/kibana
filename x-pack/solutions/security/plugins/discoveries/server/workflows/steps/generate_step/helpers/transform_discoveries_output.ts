/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';

interface AttackDiscoveryApiOutput {
  alert_ids: string[];
  details_markdown: string;
  entity_summary_markdown?: string;
  id?: string;
  mitre_attack_tactics?: string[];
  summary_markdown: string;
  timestamp?: string;
  title: string;
}

export const transformDiscoveriesOutput = (
  discoveries: AttackDiscovery[] | null | undefined,
  {
    executionUuid,
  }: {
    executionUuid: string;
  }
): AttackDiscoveryApiOutput[] | null => {
  if (discoveries == null) {
    return null;
  }

  return discoveries.map((discovery, index) => ({
    alert_ids: discovery.alertIds ?? [],
    details_markdown: discovery.detailsMarkdown ?? '',
    entity_summary_markdown: discovery.entitySummaryMarkdown,
    // If upstream did not provide an id, generate a stable, per-execution fallback id
    // so validation can persist distinct discoveries even when `alert_ids` is empty.
    id: discovery.id ?? `${executionUuid}-${index}`,
    mitre_attack_tactics: discovery.mitreAttackTactics,
    summary_markdown: discovery.summaryMarkdown ?? '',
    timestamp: discovery.timestamp,
    title: discovery.title ?? '',
  }));
};
