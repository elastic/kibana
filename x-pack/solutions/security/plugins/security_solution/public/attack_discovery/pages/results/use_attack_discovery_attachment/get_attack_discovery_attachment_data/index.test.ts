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
const ANONYMIZED_USER = 'b7cf60c1-090d-4676-aad6-666724501baf';
const UNUSED_ANONYMIZED_VALUE = 'c5ba13c4-2391-4045-962e-ec965fc1eb06';
const ANONYMIZED_ALERT_ID = 'anonymized-alert-id';

const [baseAttackDiscovery] = getMockAttackDiscoveryAlerts();

const attackDiscovery: AttackDiscoveryAlert = {
  ...baseAttackDiscovery,
  alertIds: [ANONYMIZED_ALERT_ID, 'original-alert-id'],
  detailsMarkdown: `Details for {{ host.name ${ANONYMIZED_HOST} }}`,
  entitySummaryMarkdown: `Entities: {{ user.name ${ANONYMIZED_USER} }}`,
  mitreAttackTactics: ['Initial Access', 'Execution'],
  summaryMarkdown: `Summary for {{ host.name ${ANONYMIZED_HOST} }}`,
  title: `Title for ${ANONYMIZED_HOST}`,
};

const replacements = {
  [ANONYMIZED_ALERT_ID]: 'de-anonymized-alert-id',
  [ANONYMIZED_HOST]: 'SRVMAC08',
  [ANONYMIZED_USER]: 'Administrator',
  [UNUSED_ANONYMIZED_VALUE]: 'unused',
};

describe('getAttackDiscoveryAttachmentData', () => {
  it('uses the persisted discovery id', () => {
    const result = getAttackDiscoveryAttachmentData({ attackDiscovery, replacements });

    expect(result.id).toBe(attackDiscovery.id);
  });

  // The attachment's view and the agent insert the original values from these replacements, one
  // source.
  it('sends the anonymized title and markdown, with their field syntax', () => {
    const result = getAttackDiscoveryAttachmentData({ attackDiscovery, replacements });

    expect(result).toEqual(
      expect.objectContaining({
        details_markdown: attackDiscovery.detailsMarkdown,
        entity_summary_markdown: attackDiscovery.entitySummaryMarkdown,
        summary_markdown: attackDiscovery.summaryMarkdown,
        title: attackDiscovery.title,
      })
    );
  });

  it('sends only the replacements the text uses', () => {
    const result = getAttackDiscoveryAttachmentData({ attackDiscovery, replacements });

    expect(result.replacements).toEqual({
      [ANONYMIZED_HOST]: 'SRVMAC08',
      [ANONYMIZED_USER]: 'Administrator',
    });
  });

  it('maps anonymized alert ids back to their original values', () => {
    const result = getAttackDiscoveryAttachmentData({ attackDiscovery, replacements });

    expect(result.alert_ids).toEqual(['de-anonymized-alert-id', 'original-alert-id']);
  });

  it('includes the MITRE ATT&CK tactics', () => {
    const result = getAttackDiscoveryAttachmentData({ attackDiscovery, replacements });

    expect(result.mitre_attack_tactics).toEqual(['Initial Access', 'Execution']);
  });

  it('omits the replacements when there are none', () => {
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
