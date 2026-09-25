/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AttackDiscoveryAlert,
  getOriginalAlertIds,
  replaceAnonymizedValuesWithOriginalValues,
  type Replacements,
} from '@kbn/elastic-assistant-common';

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
  summary_markdown: string;
  title: string;
}

/**
 * Builds the `security.attack_discovery` attachment payload from a persisted discovery.
 *
 * Values are de-anonymized for the analyst, and the `{{ field value }}` syntax is kept, because
 * the attachment renderer draws those tokens as field pills.
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

  const withOriginalValues = (messageContent: string): string =>
    replaceAnonymizedValuesWithOriginalValues({ messageContent, replacements });

  return {
    alert_ids: getOriginalAlertIds({ alertIds, replacements }),
    details_markdown: withOriginalValues(detailsMarkdown),
    ...(entitySummaryMarkdown != null
      ? { entity_summary_markdown: withOriginalValues(entitySummaryMarkdown) }
      : {}),
    id,
    ...(mitreAttackTactics != null ? { mitre_attack_tactics: mitreAttackTactics } : {}),
    summary_markdown: withOriginalValues(summaryMarkdown),
    title: withOriginalValues(title),
  };
};
