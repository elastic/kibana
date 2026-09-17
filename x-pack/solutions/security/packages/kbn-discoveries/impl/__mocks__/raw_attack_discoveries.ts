/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';

const rawInsights: Array<Omit<AttackDiscovery, 'timestamp'>> = [
  {
    alertIds: ['a1', 'a2'],
    detailsMarkdown: 'details 1',
    entitySummaryMarkdown: 'entity 1',
    mitreAttackTactics: ['Execution'],
    summaryMarkdown: 'summary 1',
    title: 'title 1',
  },
  {
    alertIds: ['b1', 'b2'],
    detailsMarkdown: 'details 2',
    entitySummaryMarkdown: 'entity 2',
    mitreAttackTactics: ['Credential Access'],
    summaryMarkdown: 'summary 2',
    title: 'title 2',
  },
  {
    alertIds: ['c1', 'c2'],
    detailsMarkdown: 'details 3',
    entitySummaryMarkdown: 'entity 3',
    mitreAttackTactics: ['Discovery'],
    summaryMarkdown: 'summary 3',
    title: 'title 3',
  },
  {
    alertIds: ['d1', 'd2'],
    detailsMarkdown: 'details 4',
    entitySummaryMarkdown: 'entity 4',
    mitreAttackTactics: ['Lateral Movement'],
    summaryMarkdown: 'summary 4',
    title: 'title 4',
  },
  {
    alertIds: ['e1', 'e2'],
    detailsMarkdown: 'details 5',
    entitySummaryMarkdown: 'entity 5',
    mitreAttackTactics: ['Command and Control'],
    summaryMarkdown: 'summary 5',
    title: 'title 5',
  },
];

export const getRawAttackDiscoveriesMock = (): string =>
  JSON.stringify({ insights: rawInsights }, null, 2);

export const getParsedAttackDiscoveriesMock = (timestamp: string): AttackDiscovery[] =>
  rawInsights.map((insight) => ({
    ...insight,
    alertIds: [...insight.alertIds],
    mitreAttackTactics: insight.mitreAttackTactics ? [...insight.mitreAttackTactics] : undefined,
    timestamp,
  }));
