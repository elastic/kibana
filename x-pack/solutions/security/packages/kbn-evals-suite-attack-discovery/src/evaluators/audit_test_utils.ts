/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
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
  confirmed: false,
  ...overrides,
});

export const makeOutput = (insights: AttackDiscovery[] | null): AttackDiscoveryTaskOutput => ({
  insights,
});

export const emptyInput: AttackDiscoveryDatasetExample['input'] = {
  mode: 'bundledAlerts',
  anonymizedAlerts: [],
};
