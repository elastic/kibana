/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AttackDiscoveryAlert,
  getOriginalAlertIds,
  type Replacements,
} from '@kbn/elastic-assistant-common';

import { getUsedReplacements } from '../get_used_replacements';

/**
 * The by-value payload of a `security.attack_discovery` attachment. Matches the server's
 * `attackDiscoveryAttachmentDataSchema` in the discoveries plugin.
 */
export interface AttackDiscoveryAttachmentData {
  alert_ids: string[];
  details_markdown: string;
  entity_summary_markdown?: string;
  id: string;
  mitre_attack_tactics?: string[];
  replacements?: Replacements;
  summary_markdown: string;
  title: string;
}

/**
 * Builds the `security.attack_discovery` attachment payload from a persisted discovery.
 *
 * The title and markdown are the discovery's anonymized text, with the `{{ field value }}`
 * syntax the attachment renderer draws as field pills. The replacements it uses travel with
 * them, so the attachment's view and the agent insert the same original values from one source.
 * The alert ids are sent as their original values, which the agent's tools look up.
 */
export const getAttackDiscoveryAttachmentData = ({
  attackDiscovery,
  replacements,
}: {
  attackDiscovery: AttackDiscoveryAlert;
  replacements?: Replacements;
}): AttackDiscoveryAttachmentData => {
  const {
    alertIds,
    detailsMarkdown,
    entitySummaryMarkdown,
    id,
    mitreAttackTactics,
    summaryMarkdown,
    title,
  } = attackDiscovery;

  const usedReplacements = getUsedReplacements({
    replacements,
    texts: [title, summaryMarkdown, detailsMarkdown, entitySummaryMarkdown ?? ''],
  });

  return {
    alert_ids: getOriginalAlertIds({ alertIds, replacements }),
    details_markdown: detailsMarkdown,
    ...(entitySummaryMarkdown != null ? { entity_summary_markdown: entitySummaryMarkdown } : {}),
    id,
    ...(mitreAttackTactics != null ? { mitre_attack_tactics: mitreAttackTactics } : {}),
    ...(usedReplacements != null ? { replacements: usedReplacements } : {}),
    summary_markdown: summaryMarkdown,
    title,
  };
};
