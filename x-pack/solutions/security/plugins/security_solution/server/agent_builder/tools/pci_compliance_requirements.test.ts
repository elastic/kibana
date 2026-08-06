/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_PCI_INDEX_PATTERNS,
  PCI_REQUIREMENTS,
  buildPciTimeRangeParams,
  getIndexList,
  getIndexPattern,
  getTimeRangeForCheck,
  normalizeRequirementId,
  resolveRequirementIds,
} from './pci_compliance_requirements';

describe('PCI compliance requirement builders', () => {
  const indexPattern = 'logs-*';

  /**
   * Requirements that intentionally scan the full index rather than the caller-supplied
   * time window. These queries must still be injection-safe (no interpolated time values),
   * but they do not — and should not — reference ?_tstart / ?_tend.
   */
  const FULL_INDEX_REQUIREMENT_IDS = new Set(['10.5']);

  describe('ES|QL query safety', () => {
    it('uses ?_tstart / ?_tend placeholders in every time-scoped coverage query', () => {
      for (const [id, def] of Object.entries(PCI_REQUIREMENTS)) {
        const esql = def.buildCoverageEsql(indexPattern);

        if (FULL_INDEX_REQUIREMENT_IDS.has(id)) {
          // Full-index scans have no user-supplied time value to interpolate, but they
          // must still not leak any time literal or unbound `${...}` template marker.
          expect(esql).not.toMatch(/\?_tstart|\?_tend/);
        } else {
          expect(esql).toContain('?_tstart');
          expect(esql).toContain('?_tend');
        }

        // No time string interpolated into the query.
        expect(esql).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
        // No unbound ${...} interpolation markers remaining.
        expect(esql).not.toMatch(/\$\{[^}]+\}/);
        expect(esql).toContain(`FROM ${indexPattern}`);
        // Sanity: the id is referenced in the requirement def.
        expect(def.id).toBe(id);
      }
    });

    it('uses ?_tstart / ?_tend placeholders in every violation query', () => {
      for (const def of Object.values(PCI_REQUIREMENTS)) {
        const builder = def.buildViolationEsql;
        if (builder) {
          const esql = builder(indexPattern);
          expect(esql).toContain('?_tstart');
          expect(esql).toContain('?_tend');
          expect(esql).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
          expect(esql).not.toMatch(/\$\{[^}]+\}/);
          expect(esql).toContain(`FROM ${indexPattern}`);
        }
      }
    });

    it('forwards the pre-validated index pattern verbatim into FROM', () => {
      const customPattern = 'cluster-a:logs-pci-*';
      for (const def of Object.values(PCI_REQUIREMENTS)) {
        expect(def.buildCoverageEsql(customPattern)).toContain(`FROM ${customPattern}`);
      }
    });
  });
});

describe('buildPciTimeRangeParams', () => {
  it('emits a positional params array with _tstart then _tend', () => {
    const params = buildPciTimeRangeParams({
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-08T00:00:00Z',
    });
    expect(params).toEqual([
      { _tstart: '2024-01-01T00:00:00Z' },
      { _tend: '2024-01-08T00:00:00Z' },
    ]);
  });
});

describe('getTimeRangeForCheck', () => {
  it('returns the explicit user time range when provided', () => {
    const explicit = {
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-08T00:00:00Z',
    };
    expect(getTimeRangeForCheck('8', explicit)).toEqual(explicit);
  });

  it('falls back to the per-requirement default lookback window', () => {
    const range = getTimeRangeForCheck('8');
    const diffDays = (Date.parse(range.to) - Date.parse(range.from)) / (24 * 60 * 60 * 1000);
    const expectedDays = PCI_REQUIREMENTS['8'].defaultLookbackDays;
    expect(Math.round(diffDays)).toBe(expectedDays);
  });
});

describe('normalizeRequirementId', () => {
  it('accepts "all"', () => {
    expect(normalizeRequirementId('all')).toBe('all');
  });

  it('accepts a top-level id', () => {
    expect(normalizeRequirementId('8')).toBe('8');
  });

  it('normalises a sub-requirement to its top-level id when no exact definition exists', () => {
    const result = normalizeRequirementId('1.2.3');
    expect(result === '1' || result === '1.2.3').toBe(true);
    if (result !== null) {
      expect(PCI_REQUIREMENTS[result] ?? PCI_REQUIREMENTS[result.split('.')[0]]).toBeDefined();
    }
  });

  it('returns null for unknown ids', () => {
    expect(normalizeRequirementId('99')).toBeNull();
    expect(normalizeRequirementId('drop')).toBeNull();
  });
});

describe('resolveRequirementIds', () => {
  it('returns every requirement when the list is empty or contains "all"', () => {
    const allKeys = Object.keys(PCI_REQUIREMENTS);
    expect(resolveRequirementIds()).toEqual(allKeys);
    expect(resolveRequirementIds([])).toEqual(allKeys);
    expect(resolveRequirementIds(['all'])).toEqual(allKeys);
  });

  it('expands a top-level id to include its sub-requirements', () => {
    const resolved = resolveRequirementIds(['8']);
    expect(resolved).toContain('8');
    // Every returned id must live in PCI_REQUIREMENTS.
    for (const id of resolved) {
      expect(PCI_REQUIREMENTS[id]).toBeDefined();
    }
  });

  it('silently drops unknown ids', () => {
    expect(resolveRequirementIds(['99', 'drop'])).toEqual([]);
  });
});

describe('getIndexPattern / getIndexList', () => {
  it('defaults to DEFAULT_PCI_INDEX_PATTERNS when no indices are provided', () => {
    expect(getIndexList()).toEqual([...DEFAULT_PCI_INDEX_PATTERNS]);
    expect(getIndexPattern()).toBe([...DEFAULT_PCI_INDEX_PATTERNS].join(','));
  });

  it('honours explicit indices', () => {
    const indices = ['logs-custom-a*', 'logs-custom-b*'];
    expect(getIndexList(indices)).toEqual(indices);
    expect(getIndexPattern(indices)).toBe(indices.join(','));
  });
});
