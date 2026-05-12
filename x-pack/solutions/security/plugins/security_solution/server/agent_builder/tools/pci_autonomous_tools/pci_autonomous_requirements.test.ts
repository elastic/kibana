/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Unit tests for the autonomously-authored PCI DSS v4.0.1 requirement catalog
 * and its resolution helpers.
 *
 * Includes the catalog/schema sync invariant (every catalog key parses
 * cleanly through `pciAutonomousRequirementIdSchema`). This replaces the
 * compile-time pseudo-anchor that previously lived in
 * `pci_autonomous_requirements.ts` — the schema's regex is a runtime check
 * that the TypeScript compiler cannot see, so the only honest enforcement
 * is a runtime assertion in tests.
 */

import {
  AUTONOMOUS_DEFAULT_ACCOUNT_LITERALS,
  AUTONOMOUS_DEFAULT_INDEX_PATTERNS,
  AUTONOMOUS_PCI_REQUIREMENTS,
  AUTONOMOUS_TIME_WINDOW,
  buildAutonomousTimeWindowParams,
  getAutonomousDefaultTimeRange,
  getAutonomousIndexList,
  getAutonomousIndexPattern,
  getAutonomousTimeRangeForCheck,
  normalizeAutonomousRequirementId,
  resolveAutonomousRequirementIds,
} from './pci_autonomous_requirements';
import { pciAutonomousRequirementIdSchema } from './pci_autonomous_schemas';

describe('AUTONOMOUS_PCI_REQUIREMENTS catalog', () => {
  it('declares every top-level requirement 1..12', () => {
    for (let n = 1; n <= 12; n += 1) {
      expect(AUTONOMOUS_PCI_REQUIREMENTS[String(n)]).toBeDefined();
    }
  });

  it('declares at least one sub-requirement drill-down', () => {
    const subKeys = Object.keys(AUTONOMOUS_PCI_REQUIREMENTS).filter((k) => k.includes('.'));
    expect(subKeys.length).toBeGreaterThan(0);
  });

  it('every catalog entry has a self-referential id field', () => {
    for (const [key, def] of Object.entries(AUTONOMOUS_PCI_REQUIREMENTS)) {
      expect(def?.id).toBe(key);
    }
  });

  it('every catalog entry defines a coverage query that references the time-window placeholders', () => {
    for (const def of Object.values(AUTONOMOUS_PCI_REQUIREMENTS)) {
      const coverageSql = def!.queries.coverage('logs-*');
      expect(coverageSql).toMatch(/FROM logs-\*/);
      // 10.5 (audit-log retention) deliberately runs without a window so that
      // it can find the earliest event ever recorded — everything else must
      // bind the time window via the autonomous parameter names.
      if (def!.id !== '10.5') {
        expect(coverageSql).toContain(AUTONOMOUS_TIME_WINDOW);
      }
    }
  });

  it('detect_violations requirements always have a violation query', () => {
    for (const def of Object.values(AUTONOMOUS_PCI_REQUIREMENTS)) {
      if (def!.verdict === 'detect_violations') {
        expect(typeof def!.queries.violation).toBe('function');
      }
    }
  });

  it('every default lookback has a positive day count and a non-empty rationale', () => {
    for (const def of Object.values(AUTONOMOUS_PCI_REQUIREMENTS)) {
      expect(def!.defaultLookback.days).toBeGreaterThan(0);
      expect(def!.defaultLookback.rationale.length).toBeGreaterThan(10);
    }
  });

  it('every catalog key parses cleanly through pciAutonomousRequirementIdSchema (runtime sync invariant)', () => {
    expect(() => pciAutonomousRequirementIdSchema.parse('all')).not.toThrow();
    for (const key of Object.keys(AUTONOMOUS_PCI_REQUIREMENTS)) {
      expect(() => pciAutonomousRequirementIdSchema.parse(key)).not.toThrow();
    }
  });
});

describe('AUTONOMOUS_DEFAULT_ACCOUNT_LITERALS', () => {
  it('covers Unix shorthand and Windows built-ins', () => {
    const accounts = new Set<string>(AUTONOMOUS_DEFAULT_ACCOUNT_LITERALS);
    expect(accounts.has('root')).toBe(true);
    expect(accounts.has('admin')).toBe(true);
    expect(accounts.has('Administrator')).toBe(true);
    expect(accounts.has('Guest')).toBe(true);
  });

  it('covers the most common database superuser names', () => {
    const accounts = new Set<string>(AUTONOMOUS_DEFAULT_ACCOUNT_LITERALS);
    for (const db of ['sa', 'postgres', 'oracle', 'mysql', 'mssql']) {
      expect(accounts.has(db)).toBe(true);
    }
  });
});

describe('AUTONOMOUS_DEFAULT_INDEX_PATTERNS', () => {
  it('includes logs-*, endgame-*, and winlogbeat-* (the holdout-coverage trio)', () => {
    expect(AUTONOMOUS_DEFAULT_INDEX_PATTERNS).toEqual(
      expect.arrayContaining(['logs-*', 'endgame-*', 'winlogbeat-*'])
    );
  });

  it('deliberately omits metrics-* (assessments are event-driven, not metric-driven)', () => {
    expect(AUTONOMOUS_DEFAULT_INDEX_PATTERNS).not.toContain('metrics-*');
  });
});

describe('buildAutonomousTimeWindowParams', () => {
  it('produces a 2-element ES|QL params array using self-documenting names', () => {
    const params = buildAutonomousTimeWindowParams({
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-08T00:00:00Z',
    });
    expect(params).toEqual([
      { _window_start: '2024-01-01T00:00:00Z' },
      { _window_end: '2024-01-08T00:00:00Z' },
    ]);
  });

  it('uses parameter names that match the AUTONOMOUS_TIME_WINDOW placeholders', () => {
    expect(AUTONOMOUS_TIME_WINDOW).toContain('?_window_start');
    expect(AUTONOMOUS_TIME_WINDOW).toContain('?_window_end');
  });
});

describe('getAutonomousTimeRangeForCheck', () => {
  it('prefers a user-supplied range over the catalog default', () => {
    const user = { from: '2024-01-01T00:00:00Z', to: '2024-01-08T00:00:00Z' };
    expect(getAutonomousTimeRangeForCheck('8.3.4', user)).toEqual(user);
  });

  it('uses the catalog default lookback when no range is supplied', () => {
    // 8.3.4 is a 7-day window in the catalog.
    const range = getAutonomousTimeRangeForCheck('8.3.4');
    const fromMs = new Date(range.from).getTime();
    const toMs = new Date(range.to).getTime();
    const spanDays = (toMs - fromMs) / 86_400_000;
    expect(spanDays).toBeCloseTo(7, 0);
  });

  it('falls back to a 90-day window for an unknown requirement', () => {
    const range = getAutonomousTimeRangeForCheck('99.99.99');
    const fromMs = new Date(range.from).getTime();
    const toMs = new Date(range.to).getTime();
    expect((toMs - fromMs) / 86_400_000).toBeCloseTo(90, 0);
  });
});

describe('getAutonomousDefaultTimeRange', () => {
  it('always spans a 90-day window ending at "now"', () => {
    const range = getAutonomousDefaultTimeRange();
    const fromMs = new Date(range.from).getTime();
    const toMs = new Date(range.to).getTime();
    expect((toMs - fromMs) / 86_400_000).toBeCloseTo(90, 0);
  });
});

describe('normalizeAutonomousRequirementId', () => {
  it('returns "all" verbatim', () => {
    expect(normalizeAutonomousRequirementId('all')).toBe('all');
  });

  it('returns any catalog key verbatim', () => {
    expect(normalizeAutonomousRequirementId('8')).toBe('8');
    expect(normalizeAutonomousRequirementId('8.3.4')).toBe('8.3.4');
  });

  it('collapses an unknown sub-requirement to its parent if the parent exists', () => {
    expect(normalizeAutonomousRequirementId('8.99.99')).toBe('8');
    expect(normalizeAutonomousRequirementId('12.99')).toBe('12');
  });

  it('returns null for completely unknown ids', () => {
    expect(normalizeAutonomousRequirementId('99')).toBeNull();
    expect(normalizeAutonomousRequirementId('garbage')).toBeNull();
  });
});

describe('resolveAutonomousRequirementIds', () => {
  it('returns every catalog key when input is undefined, empty, or contains "all"', () => {
    const allKeys = Object.keys(AUTONOMOUS_PCI_REQUIREMENTS);
    expect(resolveAutonomousRequirementIds(undefined)).toEqual(allKeys);
    expect(resolveAutonomousRequirementIds([])).toEqual(allKeys);
    expect(resolveAutonomousRequirementIds(['all'])).toEqual(allKeys);
  });

  it('expands a top-level id to itself plus every dotted sub-requirement', () => {
    const expanded = resolveAutonomousRequirementIds(['8']);
    expect(expanded).toContain('8');
    expect(expanded).toEqual(expect.arrayContaining(['8.2.4', '8.3.4', '8.3.6', '8.3.9', '8.4.2']));
  });

  it('passes a direct sub-requirement through without expansion', () => {
    expect(resolveAutonomousRequirementIds(['8.3.4'])).toEqual(['8.3.4']);
  });

  it('silently drops unknown ids after expansion', () => {
    const expanded = resolveAutonomousRequirementIds(['8', '99']);
    expect(expanded).toContain('8');
    expect(expanded).not.toContain('99');
  });

  it('produces a deduplicated list when callers supply overlapping ids', () => {
    const expanded = resolveAutonomousRequirementIds(['8', '8.3.4']);
    const counts = expanded.reduce<Record<string, number>>((acc, id) => {
      acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    }, {});
    for (const count of Object.values(counts)) {
      expect(count).toBe(1);
    }
  });
});

describe('getAutonomousIndexPattern / getAutonomousIndexList', () => {
  it('returns a comma-joined pattern from the default list when no input', () => {
    expect(getAutonomousIndexPattern()).toBe('logs-*,endgame-*,winlogbeat-*');
  });

  it('returns a comma-joined pattern from the caller input', () => {
    expect(getAutonomousIndexPattern(['logs-app-*', 'logs-net-*'])).toBe('logs-app-*,logs-net-*');
  });

  it('dedupes caller-supplied indices in getAutonomousIndexList', () => {
    expect(getAutonomousIndexList(['logs-*', 'logs-*', 'endgame-*'])).toEqual([
      'logs-*',
      'endgame-*',
    ]);
  });

  it('falls back to defaults when no indices supplied', () => {
    expect(getAutonomousIndexList()).toEqual([...AUTONOMOUS_DEFAULT_INDEX_PATTERNS]);
  });
});
