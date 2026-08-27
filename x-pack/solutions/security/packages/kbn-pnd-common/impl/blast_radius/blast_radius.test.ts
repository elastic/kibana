/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aggregateBlastRadius } from './blast_radius';
import { createMockInvestigation } from '../samples/investigations';

describe('aggregateBlastRadius', () => {
  it('returns empty array for no investigations', () => {
    expect(aggregateBlastRadius([])).toEqual([]);
  });

  it('excludes investigations with pendingProposalCount of 0', () => {
    const inv = createMockInvestigation({
      pendingProposalCount: 0,
      entities: [{ id: 'user:alice', name: 'alice' }],
    });
    expect(aggregateBlastRadius([inv])).toEqual([]);
  });

  it('excludes investigations with no entities', () => {
    const inv = createMockInvestigation({ pendingProposalCount: 1, entities: [] });
    expect(aggregateBlastRadius([inv])).toEqual([]);
  });

  it('produces one entry per unique entity', () => {
    const inv = createMockInvestigation({
      pendingProposalCount: 1,
      entities: [
        { id: 'user:alice', name: 'alice' },
        { id: 'host:srv-01', name: 'srv-01' },
      ],
    });
    const result = aggregateBlastRadius([inv]);
    expect(result).toHaveLength(2);
  });

  it('sums pendingProposalCount across conversations sharing an entity', () => {
    const inv1 = createMockInvestigation({
      id: 'inv-1',
      pendingProposalCount: 2,
      entities: [{ id: 'service:okta-sso', name: 'okta-sso' }],
    });
    const inv2 = createMockInvestigation({
      id: 'inv-2',
      pendingProposalCount: 1,
      entities: [{ id: 'service:okta-sso', name: 'okta-sso' }],
    });
    const result = aggregateBlastRadius([inv1, inv2]);
    expect(result).toHaveLength(1);
    expect(result[0].pendingProposalCount).toBe(3);
    expect(result[0].conversationIds).toEqual(['inv-1', 'inv-2']);
  });

  it('sorts by pendingProposalCount desc, then name asc', () => {
    const inv = createMockInvestigation({
      pendingProposalCount: 1,
      entities: [
        { id: 'service:zebra', name: 'zebra' },
        { id: 'service:alpha', name: 'alpha' },
      ],
    });
    const inv2 = createMockInvestigation({
      id: 'inv-high',
      pendingProposalCount: 3,
      entities: [{ id: 'user:top', name: 'top' }],
    });
    const result = aggregateBlastRadius([inv, inv2]);
    expect(result[0].entity.name).toBe('top');
    // alpha and zebra both have count 1 — alpha should sort before zebra
    expect(result[1].entity.name).toBe('alpha');
    expect(result[2].entity.name).toBe('zebra');
  });

  it('collects conversationIds from all contributing conversations', () => {
    const inv1 = createMockInvestigation({ id: 'c-1', pendingProposalCount: 1, entities: [{ id: 'host:h', name: 'h' }] });
    const inv2 = createMockInvestigation({ id: 'c-2', pendingProposalCount: 1, entities: [{ id: 'host:h', name: 'h' }] });
    const inv3 = createMockInvestigation({ id: 'c-3', pendingProposalCount: 1, entities: [{ id: 'host:h', name: 'h' }] });
    const result = aggregateBlastRadius([inv1, inv2, inv3]);
    expect(result[0].conversationIds).toEqual(['c-1', 'c-2', 'c-3']);
  });
});
