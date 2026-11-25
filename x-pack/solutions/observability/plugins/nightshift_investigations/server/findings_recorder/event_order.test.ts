/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { causeAfterImpactRequest, findCauseAfterImpact } from './event_order';

const event = (kind: string, at: string, title = kind) => ({ kind, at, title });

describe('findCauseAfterImpact', () => {
  it('finds a root cause later than the first customer impact', () => {
    const found = findCauseAfterImpact([
      event('customer_impact', '2026-11-24T14:54:00.000Z', 'Checkout failed'),
      event('root_cause', '2026-11-24T14:54:51.000Z', 'Bad pod'),
    ]);

    expect(found?.cause.title).toBe('Bad pod');
    expect(found?.impact.title).toBe('Checkout failed');
    expect(causeAfterImpactRequest(found!)).toContain('Bad pod');
  });

  it('accepts a cause before the impact, and the same time', () => {
    expect(
      findCauseAfterImpact([
        event('root_cause', '2026-11-24T14:54:51Z'),
        event('customer_impact', '2026-11-24T14:55:00Z'),
      ])
    ).toBeUndefined();
    expect(
      findCauseAfterImpact([
        event('root_cause', '2026-11-24T14:55:00.000Z'),
        event('customer_impact', '2026-11-24T14:55:00Z'),
      ])
    ).toBeUndefined();
  });

  it('accepts a record with an earlier cause even when another cause comes later', () => {
    expect(
      findCauseAfterImpact([
        event('root_cause', '2026-11-24T14:50:00Z'),
        event('customer_impact', '2026-11-24T14:55:00Z'),
        event('root_cause', '2026-11-24T16:00:00Z'),
      ])
    ).toBeUndefined();
  });

  it('has nothing to say without both a cause and an impact, or with a bad time', () => {
    expect(findCauseAfterImpact(undefined)).toBeUndefined();
    expect(findCauseAfterImpact([event('root_cause', '2026-11-24T14:55:00Z')])).toBeUndefined();
    expect(
      findCauseAfterImpact([
        event('root_cause', 'soon'),
        event('customer_impact', '2026-11-24T14:55:00Z'),
      ])
    ).toBeUndefined();
  });
});
