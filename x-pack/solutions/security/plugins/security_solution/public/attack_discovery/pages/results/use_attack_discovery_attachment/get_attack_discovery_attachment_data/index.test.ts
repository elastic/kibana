/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';

import { getMockAttackDiscoveryAlerts } from '../../../mock/mock_attack_discovery_alerts';
import { getAttackDiscoveryAttachmentData } from '.';

const ANONYMIZED_HOST = '3d241119-f77a-454e-8ee3-d36e05a8714f';
const ANONYMIZED_ALERT_ID = 'anonymized-alert-id';

const [baseAttackDiscovery] = getMockAttackDiscoveryAlerts();

const attackDiscovery: AttackDiscoveryAlert = {
  ...baseAttackDiscovery,
  alertIds: [ANONYMIZED_ALERT_ID, 'original-alert-id'],
  detailsMarkdown: `Details for {{ host.name ${ANONYMIZED_HOST} }}`,
  entitySummaryMarkdown: `Entities: {{ host.name ${ANONYMIZED_HOST} }}`,
  mitreAttackTactics: ['Initial Access', 'Execution'],
  summaryMarkdown: `Summary for {{ host.name ${ANONYMIZED_HOST} }}`,
  title: `Title for ${ANONYMIZED_HOST}`,
};

const replacements = {
  [ANONYMIZED_ALERT_ID]: 'de-anonymized-alert-id',
  [ANONYMIZED_HOST]: 'SRVMAC08',
};

describe('getAttackDiscoveryAttachmentData', () => {
  it('uses the persisted discovery id', () => {
    const result = getAttackDiscoveryAttachmentData({ attackDiscovery, replacements });

    expect(result.id).toBe(attackDiscovery.id);
  });

  it('de-anonymizes the title', () => {
    const result = getAttackDiscoveryAttachmentData({ attackDiscovery, replacements });

    expect(result.title).toBe('Title for SRVMAC08');
  });

  it('de-anonymizes the markdown and keeps the field syntax the renderer needs', () => {
    const result = getAttackDiscoveryAttachmentData({ attackDiscovery, replacements });

    expect(result).toEqual(
      expect.objectContaining({
        details_markdown: 'Details for {{ host.name SRVMAC08 }}',
        summary_markdown: 'Summary for {{ host.name SRVMAC08 }}',
      })
    );
  });

  it('maps anonymized alert ids back to their original values', () => {
    const result = getAttackDiscoveryAttachmentData({ attackDiscovery, replacements });

    expect(result.alert_ids).toEqual(['de-anonymized-alert-id', 'original-alert-id']);
  });

  it('keeps the values unchanged when there are no replacements', () => {
    const result = getAttackDiscoveryAttachmentData({ attackDiscovery, replacements: undefined });

    expect(result).toEqual({
      alert_ids: attackDiscovery.alertIds,
      details_markdown: attackDiscovery.detailsMarkdown,
      entity_summary_markdown: attackDiscovery.entitySummaryMarkdown,
      id: attackDiscovery.id,
      mitre_attack_tactics: attackDiscovery.mitreAttackTactics,
      summary_markdown: attackDiscovery.summaryMarkdown,
      title: attackDiscovery.title,
    });
  });

  it('de-anonymizes the entity summary and keeps the field syntax', () => {
    const result = getAttackDiscoveryAttachmentData({ attackDiscovery, replacements });

    expect(result.entity_summary_markdown).toBe('Entities: {{ host.name SRVMAC08 }}');
  });

  it('includes the MITRE ATT&CK tactics', () => {
    const result = getAttackDiscoveryAttachmentData({ attackDiscovery, replacements });

    expect(result.mitre_attack_tactics).toEqual(['Initial Access', 'Execution']);
  });

  it('omits the entity summary and tactics when the discovery has none', () => {
    const { entitySummaryMarkdown, mitreAttackTactics, ...withoutOptionalFields } = attackDiscovery;

    const result = getAttackDiscoveryAttachmentData({
      attackDiscovery: withoutOptionalFields,
      replacements,
    });

    expect(Object.keys(result)).toEqual(
      expect.not.arrayContaining(['entity_summary_markdown', 'mitre_attack_tactics'])
    );
  });
});
