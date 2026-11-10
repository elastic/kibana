/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import type { AuditReferenceResolver } from '../audit_failure_classes/registry';
import type { AuditGold } from '../audit_failure_classes/types';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';

export const makeDiscovery = (overrides: Partial<AttackDiscovery> = {}): AttackDiscovery => ({
  title: 'Suspicious activity',
  alertIds: [],
  summaryMarkdown: '',
  detailsMarkdown: '',
  timestamp: '2026-03-10T00:00:00.000Z',
  ...overrides,
});

export const makeGold = (overrides: Partial<AuditGold> = {}): AuditGold => ({
  alertGroups: {},
  forbiddenCoCitation: [],
  expectedDiscoveries: 'atLeastOne',
  confirmedGroups: [],
  ...overrides,
});

/**
 * Test seam for the registry lookup: reads `{ gold, replacements }` straight from the example
 * metadata, so unit tests can use ad-hoc gold without registering a scenario.
 */
export const resolveReferenceFromMetadata: AuditReferenceResolver = (metadata) => {
  const { gold, replacements } = (metadata ?? {}) as {
    gold?: AuditGold;
    replacements?: Replacements;
  };
  return gold ? { gold, replacements: replacements ?? {} } : undefined;
};

export const makeOutput = (insights: AttackDiscovery[] | null): AttackDiscoveryTaskOutput => ({
  insights,
});

export const emptyInput: AttackDiscoveryDatasetExample['input'] = {
  mode: 'bundledAlerts',
  anonymizedAlerts: [],
};
