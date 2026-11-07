/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import {
  archiveDemoInvestigation,
  DEMO_RECENTLY_CLOSED_MS,
  isDemoArchived,
  isDemoRecentlyClosed,
  seedDemoArchivedFromClosed,
  unarchiveDemoInvestigation,
} from './demo_archive_store';

const space = 'test-space';

const makeInvestigation = ({
  id,
  status,
  updatedAt,
}: {
  id: string;
  status: 'open' | 'closed';
  updatedAt: string;
}): InvestigationSummary =>
  ({
    id,
    title: 'Test',
    title_pending: false,
    created_at: updatedAt,
    updated_at: updatedAt,
    agent_id: 'agent',
    metadata: { status },
    in_progress: false,
    subjects: [],
  }) as InvestigationSummary;

describe('demo_archive_store', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('archives and unarchives by id', () => {
    const now = Date.parse('2026-11-06T00:00:00.000Z');
    const investigation = makeInvestigation({
      id: 'a',
      status: 'closed',
      updatedAt: new Date(now - 1000).toISOString(),
    });
    expect(isDemoArchived(investigation, space, now)).toBe(false);

    archiveDemoInvestigation(space, 'a');
    expect(isDemoArchived(investigation, space, now)).toBe(true);

    unarchiveDemoInvestigation(space, 'a');
    expect(isDemoArchived(investigation, space, now)).toBe(false);
  });

  it('treats old closed investigations as archived by age', () => {
    const now = Date.parse('2026-11-06T00:00:00.000Z');
    const old = makeInvestigation({
      id: 'old',
      status: 'closed',
      updatedAt: new Date(now - DEMO_RECENTLY_CLOSED_MS - 1000).toISOString(),
    });
    const recent = makeInvestigation({
      id: 'recent',
      status: 'closed',
      updatedAt: new Date(now - 1000).toISOString(),
    });

    expect(isDemoArchived(old, space, now)).toBe(true);
    expect(isDemoRecentlyClosed(recent, space, now)).toBe(true);
    expect(isDemoArchived(recent, space, now)).toBe(false);
  });

  it('seeds older closed ids when the store is empty', () => {
    const now = Date.parse('2026-11-06T00:00:00.000Z');
    const old = makeInvestigation({
      id: 'old',
      status: 'closed',
      updatedAt: new Date(now - DEMO_RECENTLY_CLOSED_MS - 1000).toISOString(),
    });
    seedDemoArchivedFromClosed(space, [old], now);
    expect(isDemoArchived(old, space, now)).toBe(true);
  });
});
