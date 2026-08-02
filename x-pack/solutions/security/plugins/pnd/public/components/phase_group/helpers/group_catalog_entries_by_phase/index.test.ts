/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PHASE_CATALOG, PHASE_IDS, PND_GATE_PHASE_STEP_IDS } from '@kbn/pnd-common';
import type { PhaseCatalogEntry } from '@kbn/pnd-common';
import { groupCatalogEntriesByPhase } from '.';

const entry = (id: string, phase: PhaseCatalogEntry['phase']): PhaseCatalogEntry => ({
  description: `${id} description`,
  id,
  label: id,
  liveness: 'live',
  phase,
});

describe('groupCatalogEntriesByPhase', () => {
  it('returns one group per phase', () => {
    expect(groupCatalogEntriesByPhase()).toHaveLength(PHASE_IDS.length);
  });

  it('returns the groups in PHASE_IDS order, so the flyout reads phase 1 to 4', () => {
    expect(groupCatalogEntriesByPhase().map(({ phase }) => phase)).toEqual([...PHASE_IDS]);
  });

  it('defaults to the full PHASE_CATALOG', () => {
    const total = groupCatalogEntriesByPhase().reduce(
      (count, { entries }) => count + entries.length,
      0
    );

    expect(total).toBe(PHASE_CATALOG.length);
  });

  it('places every catalog entry in exactly one group', () => {
    const grouped = groupCatalogEntriesByPhase().flatMap(({ entries }) =>
      entries.map(({ id }) => id)
    );

    expect(new Set(grouped).size).toBe(PHASE_CATALOG.length);
  });

  it('assigns each entry to its own phase', () => {
    groupCatalogEntriesByPhase().forEach(({ entries, phase }) => {
      entries.forEach((catalogEntry) => {
        expect(catalogEntry.phase).toBe(phase);
      });
    });
  });

  it('groups the four gate rows with their phases rather than into a fifth group', () => {
    const gateIds = new Set<string>(Object.values(PND_GATE_PHASE_STEP_IDS));

    const gateCounts = groupCatalogEntriesByPhase().map(
      ({ entries }) => entries.filter(({ id }) => gateIds.has(id)).length
    );

    expect(gateCounts).toEqual([1, 1, 1, 1]);
  });

  it('preserves the input order within a phase', () => {
    const entries = [
      entry('second', 'investigation'),
      entry('first', 'signal_triage'),
      entry('third', 'investigation'),
    ];

    const [signalTriage, investigation] = groupCatalogEntriesByPhase(entries);

    expect(signalTriage.entries.map(({ id }) => id)).toEqual(['first']);
    expect(investigation.entries.map(({ id }) => id)).toEqual(['second', 'third']);
  });

  it('returns an empty group for a phase with no entries, so no phase disappears', () => {
    const groups = groupCatalogEntriesByPhase([entry('only', 'post_incident')]);

    expect(groups.map(({ entries }) => entries.length)).toEqual([0, 0, 0, 1]);
  });

  it('returns four empty groups for no entries at all', () => {
    expect(groupCatalogEntriesByPhase([]).map(({ entries }) => entries)).toEqual([[], [], [], []]);
  });
});
