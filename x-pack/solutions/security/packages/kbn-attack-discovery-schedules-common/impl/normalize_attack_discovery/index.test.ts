/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeAttackDiscovery } from '.';

describe('normalizeAttackDiscovery', () => {
  it('maps camelCase keys through unchanged', () => {
    const raw = {
      alertIds: ['a', 'b'],
      detailsMarkdown: 'details',
      entitySummaryMarkdown: 'entity',
      id: 'id-1',
      mitreAttackTactics: ['Execution'],
      summaryMarkdown: 'summary',
      timestamp: '2024-10-10T22:59:52.749Z',
      title: 'title',
    };

    expect(normalizeAttackDiscovery(raw)).toEqual(raw);
  });

  it('maps snake_case keys to camelCase', () => {
    const raw = {
      alert_ids: ['a', 'b'],
      details_markdown: 'details',
      entity_summary_markdown: 'entity',
      id: 'id-1',
      mitre_attack_tactics: ['Execution'],
      summary_markdown: 'summary',
      timestamp: '2024-10-10T22:59:52.749Z',
      title: 'title',
    };

    expect(normalizeAttackDiscovery(raw)).toEqual({
      alertIds: ['a', 'b'],
      detailsMarkdown: 'details',
      entitySummaryMarkdown: 'entity',
      id: 'id-1',
      mitreAttackTactics: ['Execution'],
      summaryMarkdown: 'summary',
      timestamp: '2024-10-10T22:59:52.749Z',
      title: 'title',
    });
  });

  it('falls back to defaults for missing required fields', () => {
    expect(normalizeAttackDiscovery({})).toEqual({
      alertIds: [],
      detailsMarkdown: '',
      entitySummaryMarkdown: undefined,
      id: undefined,
      mitreAttackTactics: undefined,
      summaryMarkdown: '',
      timestamp: '',
      title: '',
    });
  });
});
