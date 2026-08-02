/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryApiAlert } from '@kbn/elastic-assistant-common';

import { buildAttackDiscoveryMarkdown } from '.';

const alert: AttackDiscoveryApiAlert = {
  alert_ids: ['alert-1'],
  connector_id: 'connector-1',
  connector_name: 'GPT-5 Chat',
  details_markdown: 'These are the **details** of the attack.',
  entity_summary_markdown: 'Host `host-1` and user `user-1`.',
  generation_uuid: 'gen-1',
  id: 'ad-1',
  mitre_attack_tactics: ['Initial Access'],
  summary_markdown: 'This is the summary.',
  timestamp: '2026-08-02T00:00:00.000Z',
  title: 'Suspicious activity detected',
};

describe('buildAttackDiscoveryMarkdown', () => {
  it('renders the title heading', () => {
    expect(buildAttackDiscoveryMarkdown(alert)).toContain('## Suspicious activity detected');
  });

  it('renders the summary section', () => {
    expect(buildAttackDiscoveryMarkdown(alert)).toContain('This is the summary.');
  });

  it('renders the details section', () => {
    expect(buildAttackDiscoveryMarkdown(alert)).toContain(
      'These are the **details** of the attack.'
    );
  });

  it('renders the entity summary', () => {
    expect(buildAttackDiscoveryMarkdown(alert)).toContain('Host `host-1` and user `user-1`.');
  });

  it('returns a non-empty string', () => {
    expect(buildAttackDiscoveryMarkdown(alert).length).toBeGreaterThan(0);
  });
});
