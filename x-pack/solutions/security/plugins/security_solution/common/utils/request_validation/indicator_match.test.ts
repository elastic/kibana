/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  containsDoesNotMatchEntriesOnly,
  containsInvalidDoesNotMatchEntries,
} from './indicator_match';

import type { ThreatMapping } from '../../api/detection_engine/model/rule_schema';

describe('containsDoesNotMatchEntriesOnly', () => {
  test('returns false when items is empty', () => {
    expect(containsDoesNotMatchEntriesOnly([])).toBe(false);
  });

  test('returns true when items contains single entry with negate=true', () => {
    const items = [
      {
        entries: [
          { field: 'field.one', type: 'mapping' as const, value: 'field.one', negate: true },
        ],
      },
    ];
    expect(containsDoesNotMatchEntriesOnly(items)).toBe(true);
  });

  test('returns true when items contains entry with multiple negate=true only', () => {
    const items = [
      {
        entries: [
          { field: 'field.one', type: 'mapping' as const, value: 'field.one', negate: true },
          { field: 'field.two', type: 'mapping' as const, value: 'field.two', negate: true },
        ],
      },
    ];
    expect(containsDoesNotMatchEntriesOnly(items)).toBe(true);
  });

  test('returns false when items contains single entry with negate=false', () => {
    const items = [
      {
        entries: [
          { field: 'field.one', type: 'mapping' as const, value: 'field.one', negate: false },
        ],
      },
    ];
    expect(containsDoesNotMatchEntriesOnly(items)).toBe(false);
  });

  test('returns false when items contains one entry with negate=false', () => {
    const items = [
      {
        entries: [
          { field: 'field.one', type: 'mapping' as const, value: 'field.one', negate: true },
          { field: 'field.two', type: 'mapping' as const, value: 'field.two', negate: false },
        ],
      },
    ];
    expect(containsDoesNotMatchEntriesOnly(items)).toBe(false);
  });

  test('returns true when one of multiple entries contains negate=true', () => {
    const items = [
      {
        entries: [
          { field: 'field.one', type: 'mapping' as const, value: 'field.one', negate: false },
        ],
      },
      {
        entries: [
          { field: 'field.two', type: 'mapping' as const, value: 'field.two', negate: true },
        ],
      },
    ];
    expect(containsDoesNotMatchEntriesOnly(items)).toBe(true);
  });
});

describe('containsInvalidDoesNotMatchEntries', () => {
  it('returns false for empty items', () => {
    expect(containsInvalidDoesNotMatchEntries([])).toBe(false);
  });

  it('returns false when no entries have negate=true', () => {
    const items: ThreatMapping = [
      {
        entries: [
          {
            field: 'user.name',
            type: 'mapping' as const,
            value: 'threat.indicator.user.name',
            negate: false,
          },
        ],
      },
    ];
    expect(containsInvalidDoesNotMatchEntries(items)).toBe(false);
  });

  it('returns false when one entry has negate=true', () => {
    const items: ThreatMapping = [
      {
        entries: [
          {
            field: 'user.name',
            type: 'mapping' as const,
            value: 'threat.indicator.user.name',
            negate: true,
          },
        ],
      },
    ];
    expect(containsInvalidDoesNotMatchEntries(items)).toBe(false);
  });

  it('returns true when both entries have same fields and opposite negate', () => {
    const items: ThreatMapping = [
      {
        entries: [
          {
            field: 'user.name',
            type: 'mapping' as const,
            value: 'threat.indicator.user.name',
            negate: true,
          },
          {
            field: 'user.name',
            type: 'mapping' as const,
            value: 'threat.indicator.user.name',
            negate: false,
          },
        ],
      },
    ];
    expect(containsInvalidDoesNotMatchEntries(items)).toBe(true);
  });

  it('returns true when both entries have same fields and opposite negate with multiple negate entries', () => {
    const items: ThreatMapping = [
      {
        entries: [
          {
            field: 'user.name',
            type: 'mapping' as const,
            value: 'threat.indicator.user.name',
            negate: false,
          },
          {
            field: 'user.name',
            type: 'mapping' as const,
            value: 'threat.indicator.user.name',
            negate: true,
          },
          {
            field: 'user.name',
            type: 'mapping' as const,
            value: 'threat.indicator.host.name',
            negate: true,
          },
        ],
      },
    ];
    expect(containsInvalidDoesNotMatchEntries(items)).toBe(true);
  });

  it('returns false when both entries have different fields and opposite negate', () => {
    const items: ThreatMapping = [
      {
        entries: [
          {
            field: 'user.name',
            type: 'mapping' as const,
            value: 'threat.indicator.user.name',
            negate: true,
          },
          {
            field: 'host.name',
            type: 'mapping' as const,
            value: 'threat.indicator.host.name',
            negate: false,
          },
        ],
      },
    ];
    expect(containsInvalidDoesNotMatchEntries(items)).toBe(false);
  });

  it('returns true if any of multiple entries matches invalid condition', () => {
    const items: ThreatMapping = [
      {
        entries: [
          {
            field: 'user.name',
            type: 'mapping' as const,
            value: 'threat.indicator.user.name',
            negate: true,
          },
          {
            field: 'user.name',
            type: 'mapping' as const,
            value: 'threat.indicator.user.name',
            negate: false,
          },
        ],
      },
      {
        entries: [
          {
            field: 'user.name',
            type: 'mapping' as const,
            value: 'threat.indicator.user.name',
            negate: false,
          },
        ],
      },
    ];
    expect(containsInvalidDoesNotMatchEntries(items)).toBe(true);
  });
});
