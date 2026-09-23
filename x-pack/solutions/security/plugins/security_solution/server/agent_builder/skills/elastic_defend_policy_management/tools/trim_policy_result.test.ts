/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { policyFactory } from '../../../../../common/endpoint/models/policy_config';
import { hashPolicyConfig } from '../domain/hash_policy_config';
import { normalize } from '../domain/normalize_policy_config';
import {
  DEFAULT_TRIM_LIMITS,
  GUARDED_ENVELOPE_HEADROOM_TOKENS,
  estimateGuardedEnvelopeTokens,
  fitsGuardedEnvelope,
  omitTrailingToFit,
  presentBoundedIdentityStrings,
  presentFromTo,
  presentWithinGuardedBudget,
  toPresentationHash,
  trimPolicyResultWithMeta,
  tryOmitTrailingToFit,
} from './trim_policy_result';

const nest = (depth: number, leaf: unknown): unknown =>
  depth === 0 ? leaf : { next: nest(depth - 1, leaf) };

const items = (length: number) => Array.from({ length }, (_, index) => `item-${index}`);

const keyed = (length: number, value: (index: number) => unknown): Record<string, unknown> => {
  const record: Record<string, unknown> = {};
  for (let index = 0; index < length; index += 1) {
    record[`k${String(index).padStart(2, '0')}`] = value(index);
  }
  return record;
};

const countPresentedNodes = (value: unknown): number => {
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + countPresentedNodes(item), 1);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).reduce<number>(
      (total, item) => total + countPresentedNodes(item),
      1
    );
  }
  return 1;
};

describe('trimPolicyResultWithMeta', () => {
  it('caps strings at 512 and reports the truncation site out of band', () => {
    const exact = 'E'.repeat(512);
    const over = 'Y'.repeat(600);
    expect(trimPolicyResultWithMeta({ label: exact })).toEqual({ value: { label: exact } });
    expect(trimPolicyResultWithMeta({ label: over })).toEqual({
      value: { label: 'Y'.repeat(512) },
      summary: { entries: [{ path: 'label', reason: 'string_truncated' }] },
    });
    expect(trimPolicyResultWithMeta(over)).toEqual({
      value: 'Y'.repeat(512),
      summary: { entries: [{ path: '', reason: 'string_truncated' }] },
    });
  });

  it('retains legitimate metadata-named keys in the value and keeps truncation out of band', () => {
    const stringCase = {
      string_truncated: 'keep-string',
      value_truncated: 'keep-value',
      value_total: 'keep-total',
      label: 'Y'.repeat(600),
    };
    const { value, summary } = trimPolicyResultWithMeta(stringCase);
    expect(value).toEqual({
      string_truncated: 'keep-string',
      value_truncated: 'keep-value',
      value_total: 'keep-total',
      label: 'Y'.repeat(512),
    });
    expect(summary).toEqual({ entries: [{ path: 'label', reason: 'string_truncated' }] });

    const objectCase: Record<string, unknown> = {
      string_truncated: 'keep-string',
      value_truncated: 'keep-value',
      value_total: 'keep-total',
    };
    for (let index = 0; index < 49; index += 1) {
      objectCase[`z${String(index).padStart(2, '0')}`] = `keep-${index}`;
    }
    const cappedResult = trimPolicyResultWithMeta(objectCase);
    expect(cappedResult.value).toEqual(
      expect.objectContaining({
        string_truncated: 'keep-string',
        value_truncated: 'keep-value',
        value_total: 'keep-total',
      })
    );
    expect(cappedResult.summary).toEqual({
      entries: [expect.objectContaining({ path: '', reason: 'object_truncated', total: 52 })],
      output_truncated: true,
      output_total_nodes: 53,
    });
  });

  it('caps arrays at 50 and addresses the container truncation by path', () => {
    const exact = items(50);
    const over = items(80);
    const capped = over.slice(0, 50);
    expect(trimPolicyResultWithMeta({ values: exact })).toEqual({ value: { values: exact } });
    expect(trimPolicyResultWithMeta({ values: over })).toEqual({
      value: { values: capped },
      summary: {
        entries: [{ path: 'values', reason: 'array_truncated', total: 80 }],
        output_truncated: true,
        output_total_nodes: 1 + 1 + 80,
      },
    });
    expect(trimPolicyResultWithMeta(over)).toEqual({
      value: capped,
      summary: {
        entries: [{ path: '', reason: 'array_truncated', total: 80 }],
        output_truncated: true,
        output_total_nodes: 81,
      },
    });
  });

  it('addresses nested container caps relative to the presented value', () => {
    const over = items(80);
    const capped = over.slice(0, 50);
    expect(trimPolicyResultWithMeta({ child: { values: over } })).toEqual({
      value: { child: { values: capped } },
      summary: {
        entries: [{ path: 'child.values', reason: 'array_truncated', total: 80 }],
        output_truncated: true,
        output_total_nodes: 1 + 1 + 1 + 80,
      },
    });
  });

  it('caps object entries at 50 in deterministic key order and reports the total out of band', () => {
    const exact = keyed(50, (index) => `keep-${index}`);
    const over: Record<string, string> = { alpha: 'first', mu: 'middle' };
    for (let index = 0; index < 48; index += 1) {
      over[`n${String(index).padStart(2, '0')}`] = `keep-${index}`;
    }
    over.zzz_secret = 'RAW_DROPPED_VALUE';

    const trimmedExact = trimPolicyResultWithMeta(exact);
    expect(trimmedExact.value).toEqual(exact);
    expect(trimmedExact.summary).toBeUndefined();

    const trimmedOver = trimPolicyResultWithMeta(over);
    const trimmedValue = trimmedOver.value as Record<string, unknown>;
    const dataKeys = Object.keys(trimmedValue);
    expect(dataKeys).toHaveLength(50);
    expect(dataKeys).toEqual([...dataKeys].sort((a, b) => a.localeCompare(b)));
    expect(dataKeys[0]).toBe('alpha');
    expect(trimmedValue).toEqual(
      expect.objectContaining({
        alpha: 'first',
        mu: 'middle',
      })
    );
    expect(trimmedValue).not.toHaveProperty('zzz_secret');
    expect(JSON.stringify(trimmedValue)).not.toContain('RAW_DROPPED_VALUE');
    expect(trimmedOver.summary).toEqual({
      entries: [{ path: '', reason: 'object_truncated', total: 51 }],
      output_truncated: true,
      output_total_nodes: 52,
    });
  });

  it('replaces depth-cut subtrees with null and addresses them by path', () => {
    const { value, summary } = trimPolicyResultWithMeta(nest(10, { secret: 'HIDDEN_DEEP_VALUE' }));
    expect(JSON.stringify(value)).not.toContain('HIDDEN_DEEP_VALUE');
    expect(JSON.stringify(value)).not.toContain('secret');
    expect(summary).toEqual({
      entries: [
        { path: 'next.next.next.next.next.next.next.next.next.next', reason: 'depth_truncated' },
      ],
    });
  });

  it('applies the 500-node presentation budget and reports the original total without entries', () => {
    const { value, summary } = trimPolicyResultWithMeta(
      keyed(50, () => Array.from({ length: 50 }, (_, item) => item))
    );
    expect(summary).toEqual({
      entries: [],
      output_truncated: true,
      output_total_nodes: 1 + 50 + 50 * 50,
    });
    const trimmedValue = value as Record<string, unknown>;
    expect(Object.keys(trimmedValue).some((key) => /^k\d{2}$/.test(key) && key > 'k09')).toBe(
      false
    );
    expect(countPresentedNodes(trimmedValue)).toBeLessThanOrEqual(500);
  });

  it('caps summary entries at 50 and discloses when the metadata cap is hit', () => {
    const input = Array.from({ length: 60 }, (_, index) => `Y${index}-`.repeat(600));
    const { value, summary } = trimPolicyResultWithMeta(input);
    const trimmedArray = value as unknown[];
    expect(trimmedArray).toHaveLength(50);
    expect(summary?.entries).toHaveLength(50);
    expect(summary?.entries_truncated).toBe(true);
    expect(summary?.entries_total).toBe(51);
    expect(summary?.entries[0]).toEqual({
      path: '',
      reason: 'array_truncated',
      total: 60,
    });
    expect(summary?.entries[1]).toEqual({ path: '[0]', reason: 'string_truncated' });
  });

  it('digests the complete stableStringify service hash as a compact SHA-256', () => {
    const serviceHash = hashPolicyConfig(normalize(policyFactory()));
    const digest = toPresentationHash(serviceHash);
    expect(digest).toBe(createHash('sha256').update(serviceHash).digest('hex'));
  });

  it('estimates the exact guarded envelope and omits trailing items with totals', () => {
    const dto = omitTrailingToFit(
      (keep) => ({
        items: Array.from({ length: keep }, (_, index) => ({
          id: `row-${index}`,
          pad: 'N'.repeat(200),
        })),
        items_total: 8,
        items_truncated: keep < 8,
      }),
      8,
      200
    );
    expect(estimateGuardedEnvelopeTokens(dto)).toBeLessThanOrEqual(
      200 - GUARDED_ENVELOPE_HEADROOM_TOKENS
    );
    expect(dto.items_total).toBe(8);
    expect(dto.items_truncated).toBe(true);
    expect(dto.items.length).toBeGreaterThan(0);
    expect(dto.items.length).toBeLessThan(8);
  });

  it("projects only supplied identity fields and keeps those fields' truncation flags", () => {
    expect(
      presentBoundedIdentityStrings({
        id: 'I'.repeat(600),
        name: 'Endpoint Policy',
        revision: 4,
        version: 'V'.repeat(600),
      })
    ).toEqual({
      id: 'I'.repeat(512),
      id_string_truncated: true,
      name: 'Endpoint Policy',
      revision: 4,
      version: 'V'.repeat(512),
      version_string_truncated: true,
    });
  });

  it('presents trimmed from/to values with sided out-of-band summaries only', () => {
    const over = 'Y'.repeat(600);
    expect(presentFromTo({ from: over, to: { label: over } }, DEFAULT_TRIM_LIMITS)).toEqual({
      from: 'Y'.repeat(512),
      to: { label: 'Y'.repeat(512) },
      from_truncation: { entries: [{ path: '', reason: 'string_truncated' }] },
      to_truncation: { entries: [{ path: 'label', reason: 'string_truncated' }] },
    });

    const itemsOver = items(80);
    const capped = itemsOver.slice(0, 50);
    const arraySummary = {
      entries: [{ path: '', reason: 'array_truncated', total: 80 }],
      output_truncated: true,
      output_total_nodes: 81,
    };
    expect(presentFromTo({ from: itemsOver, to: itemsOver }, DEFAULT_TRIM_LIMITS)).toEqual({
      from: capped,
      to: capped,
      from_truncation: arraySummary,
      to_truncation: arraySummary,
    });
  });

  it('returns undefined from tryOmitTrailingToFit when even keep=0 overflows', () => {
    expect(tryOmitTrailingToFit(() => ({ pad: 'X'.repeat(4_000) }), 3, 200)).toBeUndefined();
  });

  it('does not return an over-budget last attempt from omitTrailingToFit', () => {
    const oversized = { pad: 'X'.repeat(4_000) };
    const skeleton = { ok: true, value_total: 8, value_truncated: true };
    const dto = omitTrailingToFit(
      () => oversized,
      3,
      200,
      () => skeleton
    );
    expect(dto).toEqual(skeleton);
    expect(fitsGuardedEnvelope(dto, 200)).toBe(true);
    expect(() => omitTrailingToFit(() => oversized, 0, 200)).toThrow(
      'Policy tool result exceeded the guarded token envelope'
    );
  });

  it('does not return an over-budget last attempt from presentWithinGuardedBudget', () => {
    const oversized = { pad: 'X'.repeat(4_000) };
    const skeleton = { ok: true };
    const dto = presentWithinGuardedBudget(
      () => oversized,
      200,
      () => skeleton
    );
    expect(dto).toEqual(skeleton);
    expect(fitsGuardedEnvelope(dto, 200)).toBe(true);
    expect(
      presentWithinGuardedBudget(
        () => ({ ok: true }),
        200,
        () => skeleton
      )
    ).toEqual({
      ok: true,
    });
    expect(() =>
      presentWithinGuardedBudget(
        () => oversized,
        200,
        () => oversized
      )
    ).toThrow('Policy tool result exceeded the guarded token envelope');
  });
});
