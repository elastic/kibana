/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROTATING_SHARE, selectForEvaluation } from './select_for_evaluation';

const candidate = (id: string, severityScore: number) => ({ id, severityScore });
const ids = (selected: Array<{ id: string }>): string[] => selected.map(({ id }) => id);

describe('selectForEvaluation', () => {
  it('returns everything when it fits under the limit, highest score first', () => {
    const selected = selectForEvaluation({
      candidates: [candidate('low', 10), candidate('high', 90), candidate('mid', 50)],
      limit: 5,
      tick: 7,
    });

    expect(ids(selected)).toEqual(['high', 'mid', 'low']);
  });

  it('fills the limit from the highest score down and defers the rest', () => {
    const selected = selectForEvaluation({
      candidates: [candidate('low', 10), candidate('h1', 90), candidate('h2', 90)],
      limit: 2,
      tick: 0,
    });

    expect(ids(selected).sort()).toEqual(['h1', 'h2']);
  });

  it('selects nothing for a limit of zero', () => {
    expect(selectForEvaluation({ candidates: [candidate('a', 1)], limit: 0, tick: 3 })).toEqual([]);
  });

  it('rotates within one score so every series is reached over consecutive ticks', () => {
    const candidates = ['a', 'b', 'c', 'd', 'e'].map((id) => candidate(id, 50));
    const seen = new Set<string>();

    for (let tick = 0; tick < 5; tick++) {
      const selected = selectForEvaluation({ candidates, limit: 2, tick });
      expect(selected).toHaveLength(2);
      ids(selected).forEach((id) => seen.add(id));
    }

    expect([...seen].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('does not depend on the input order', () => {
    const forward = ['a', 'b', 'c', 'd'].map((id) => candidate(id, 50));

    expect(ids(selectForEvaluation({ candidates: forward, limit: 2, tick: 3 }))).toEqual(
      ids(selectForEvaluation({ candidates: [...forward].reverse(), limit: 2, tick: 3 }))
    );
  });

  it('rotates only the tier that does not fit, after higher tiers take their slots', () => {
    const candidates = [candidate('top', 90), ...['a', 'b', 'c'].map((id) => candidate(id, 50))];

    for (let tick = 0; tick < 6; tick++) {
      const selected = selectForEvaluation({ candidates, limit: 2, tick });
      expect(ids(selected)[0]).toBe('top');
      expect(selected).toHaveLength(2);
    }
  });

  describe('rotating share', () => {
    const limit = 10;
    const rotatingSlots = Math.floor(limit * ROTATING_SHARE);

    it('reaches a low-score series even when higher scores fill every priority slot', () => {
      const high = Array.from({ length: 40 }, (_, i) => candidate(`high-${i}`, 90));
      const low = Array.from({ length: 6 }, (_, i) => candidate(`low-${i}`, 10));
      const seen = new Set<string>();

      for (let tick = 0; tick < Math.ceil((high.length + low.length) / rotatingSlots); tick++) {
        const selected = selectForEvaluation({ candidates: [...high, ...low], limit, tick });
        expect(selected).toHaveLength(limit);
        expect(new Set(ids(selected)).size).toBe(limit);
        ids(selected).forEach((id) => seen.add(id));
      }

      low.forEach(({ id }) => expect(seen).toContain(id));
    });

    it('keeps most slots for the highest scores', () => {
      const candidates = [
        ...Array.from({ length: 12 }, (_, i) => candidate(`high-${i}`, 90)),
        ...Array.from({ length: 12 }, (_, i) => candidate(`low-${i}`, 10)),
      ];

      const selected = selectForEvaluation({ candidates, limit, tick: 0 });

      const highSelected = ids(selected).filter((id) => id.startsWith('high-'));
      // The priority slots all go to the high score; the rotating slots may land on either.
      expect(highSelected.length).toBeGreaterThanOrEqual(limit - rotatingSlots);
    });

    it('selects each series at least once per cycle of ticks', () => {
      const candidates = Array.from({ length: 30 }, (_, i) =>
        candidate(`s-${i}`, i % 3 === 0 ? 90 : 20)
      );
      const seen = new Set<string>();

      for (let tick = 0; tick < Math.ceil(candidates.length / rotatingSlots); tick++) {
        ids(selectForEvaluation({ candidates, limit, tick })).forEach((id) => seen.add(id));
      }

      expect(seen.size).toBe(candidates.length);
    });
  });
});
