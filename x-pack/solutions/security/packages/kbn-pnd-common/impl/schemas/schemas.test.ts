/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_INVESTIGATIONS, MOCK_PROPOSALS, MOCK_WATCHES } from '../samples';
import type { Investigation, Proposal, Watch } from '.';
import {
  GetInvestigationResponse,
  GetWatchResponse,
  ListInvestigationProposalsResponse,
  ListInvestigationsResponse,
  ListWatchesResponse,
  WatchSettings,
} from '.';

describe('PND schema smoke tests', () => {
  it('parses mock watches through ListWatchesResponse', () => {
    const result = ListWatchesResponse.parse({ watches: MOCK_WATCHES });
    expect(result.watches).toHaveLength(4);
    result.watches.forEach((watch: Watch) => {
      expect(watch.tags).toContain('watch');
      expect(watch.managed).toBe(false);
    });
  });

  it('parses individual mock watches through GetWatchResponse', () => {
    for (const watch of MOCK_WATCHES) {
      const result = GetWatchResponse.parse({ watch });
      expect(result.watch.id).toBe(watch.id);
    }
  });

  it.each(['60s', '90s', '15m', '2h', '1d'])('accepts the workflow interval %s', (interval) => {
    expect(
      WatchSettings.safeParse({
        enabled: true,
        description: 'Description',
        autonomyLevel: 'manual',
        scheduleInterval: interval,
      }).success
    ).toBe(true);
  });

  it.each(['0s', '59s', '0m', '00h'])('rejects the invalid interval %s', (interval) => {
    expect(
      WatchSettings.safeParse({
        enabled: true,
        description: 'Description',
        autonomyLevel: 'manual',
        scheduleInterval: interval,
      }).success
    ).toBe(false);
  });

  it('parses mock investigations through ListInvestigationsResponse', () => {
    const result = ListInvestigationsResponse.parse({
      investigations: MOCK_INVESTIGATIONS,
      total: MOCK_INVESTIGATIONS.length,
    });
    expect(result.total).toBeGreaterThanOrEqual(8);
    result.investigations.forEach((inv: Investigation) => {
      expect(inv.template_id).toBe('investigation');
    });
  });

  it('parses mock proposals through ListInvestigationProposalsResponse', () => {
    const result = ListInvestigationProposalsResponse.parse({
      proposals: MOCK_PROPOSALS,
      total: MOCK_PROPOSALS.length,
    });
    expect(result.proposals.length).toBeGreaterThanOrEqual(8);
    result.proposals.forEach((prop: Proposal) => {
      expect(prop.template_id).toBe('proposal');
    });
  });

  it('parses investigation detail through GetInvestigationResponse', () => {
    const investigation = MOCK_INVESTIGATIONS[0];
    const result = GetInvestigationResponse.parse({ investigation });
    expect(result.investigation.id).toBe(investigation.id);
  });
});
