/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HuntAvailability,
  HuntLibraryDetail,
  HuntLibraryListItem,
} from '../../../common/hunt_library';

export const available = (identity: HuntAvailability['identity'] = 'caller'): HuntAvailability => ({
  identity,
  available: true,
  firstFailure: null,
  failures: [],
  probe: identity === 'caller' ? 'passed' : 'skipped',
});

export const unavailable = (
  failures: HuntAvailability['failures'],
  identity: HuntAvailability['identity'] = 'caller'
): HuntAvailability => ({
  identity,
  available: false,
  firstFailure: failures[0].reason,
  failures,
  probe: 'skipped',
});

export const makeHunt = (overrides: Partial<HuntLibraryListItem> = {}): HuntLibraryListItem => ({
  id: 'rare_lsass_process_access',
  version: 1,
  name: 'Rare LSASS Process Access',
  description: 'Finds rare processes that open LSASS memory.',
  platform: ['windows'],
  mitreTechniques: ['T1003'],
  resultKind: 'aggregate',
  availability: available(),
  ...overrides,
});

export const makeDetail = (overrides: Partial<HuntLibraryDetail> = {}): HuntLibraryDetail => {
  const { availability: _availability, ...hunt } = makeHunt();
  return {
    ...hunt,
    hypothesis: 'A process opening LSASS on one host may be dumping credentials.',
    references: ['https://example.com/lsass'],
    guidance: {
      analystNotes: ['Pivot on process.executable.'],
      expectedFalsePositives: ['Backup software.'],
      suggestedPivots: ['Check the parent process.'],
    },
    query: {
      id: 'main',
      query: 'FROM logs-endpoint.events.api*\n| LIMIT 10',
      defaultTimeRange: { from: 'now-7d', to: 'now' },
      recommendedColumns: ['host.id'],
      requiredIndexPatterns: ['logs-endpoint.events.api*'],
      requiredFields: ['host.id'],
    },
    source: { tradeId: 't', path: 'hunting/windows/queries/x.toml', revision: 'abc123' },
    callerAvailability: available(),
    workerAvailability: available('worker'),
    ...overrides,
  };
};
