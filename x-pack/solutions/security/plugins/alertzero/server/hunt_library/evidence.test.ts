/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHuntDefinition } from './seed';
import {
  AGGREGATE_EVIDENCE_LABEL,
  canonicalJson,
  hashPreservationContext,
  prepareEvidence,
  sanitizeEvidenceFields,
  type PreservationContext,
} from './evidence';

const raw = getHuntDefinition('okta_failed_oauth_public_client_scope')!;
const aggregate = getHuntDefinition('linux_gtfobins_external_connections')!;

const context: PreservationContext = {
  query: 'FROM logs-*',
  filters: [],
  timeRange: { from: 'now-7d', to: 'now' },
  dataViewId: 'dv-1',
};

const esClient = (docs: unknown[]) => ({ mget: jest.fn().mockResolvedValue({ docs }) } as never);

describe('canonicalJson', () => {
  it('sorts keys so equal objects serialize identically', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(
      canonicalJson({ a: { c: 3, d: 2 }, b: 1 })
    );
    expect(canonicalJson({ b: 1, a: [2, { z: 1, y: 2 }] })).toBe('{"a":[2,{"y":2,"z":1}],"b":1}');
  });
});

describe('sanitizeEvidenceFields', () => {
  it('drops credential-like fields and keeps ordinary ones', () => {
    expect(
      sanitizeEvidenceFields({
        'host.name': 'web-1',
        'user.password': 'x',
        'okta.request.api_key': 'y',
        'http.request.body': 'z',
        'auth.token': 't',
        count: 3,
        flag: true,
        missing: null,
      })
    ).toEqual({ 'host.name': 'web-1', count: 3, flag: true, missing: null });
  });

  it('truncates long strings and stringifies non-scalar values', () => {
    const row = sanitizeEvidenceFields({ long: 'a'.repeat(5000), list: ['a', 'b'] });

    expect((row.long as string).length).toBe(1024);
    expect(row.list).toBe('["a","b"]');
  });

  it('caps the number of fields', () => {
    const many = Object.fromEntries(
      Array.from({ length: 100 }, (_, index) => [`f${index}`, index])
    );

    expect(Object.keys(sanitizeEvidenceFields(many))).toHaveLength(30);
    expect(Object.keys(sanitizeEvidenceFields(many, 5))).toHaveLength(5);
  });
});

describe('hashPreservationContext', () => {
  it('is stable for equal context and changes with the query, window or filters', () => {
    const base = hashPreservationContext(context);

    expect(hashPreservationContext({ ...context })).toBe(base);
    expect(hashPreservationContext({ ...context, query: 'FROM other' })).not.toBe(base);
    expect(
      hashPreservationContext({ ...context, timeRange: { from: 'now-1d', to: 'now' } })
    ).not.toBe(base);
    expect(hashPreservationContext({ ...context, filters: [{ a: 1 }] })).not.toBe(base);
  });
});

describe('prepareEvidence for a raw event hunt', () => {
  const found = (id: string, source: Record<string, unknown>) => ({
    _index: 'logs-okta',
    _id: id,
    found: true,
    _source: source,
  });

  it('re-reads each document, keeps only allowlisted fields, and fingerprints by index and id', async () => {
    const client = esClient([
      found('e1', { okta: { actor: { id: 'u1' } }, 'user.password': 'secret' }),
    ]);

    const result = await prepareEvidence({
      esClient: client,
      definition: raw,
      sessionId: 's1',
      context,
      selection: [{ kind: 'raw_event', index: 'logs-okta', id: 'e1' }],
    });

    const [{ docs }] = (client as unknown as { mget: jest.Mock }).mget.mock.calls[0];
    expect(docs).toEqual([{ _index: 'logs-okta', _id: 'e1', _source: raw.query.evidenceFields }]);
    expect(result.rows[0]).toMatchObject({ _index: 'logs-okta', _id: 'e1', 'okta.actor.id': 'u1' });
    expect(result.rows[0]).not.toHaveProperty('user.password');
    expect(result.fingerprints).toHaveLength(1);
  });

  it('gives the same fingerprint for the same document whatever else changes', async () => {
    const run = (sessionId: string, query: string) =>
      prepareEvidence({
        esClient: esClient([found('e1', {})]),
        definition: raw,
        sessionId,
        context: { ...context, query },
        selection: [{ kind: 'raw_event', index: 'logs-okta', id: 'e1' }],
      });

    const [a, b] = await Promise.all([run('s1', 'q1'), run('s2', 'q2')]);

    expect(a.fingerprints).toEqual(b.fingerprints);
  });

  it.each([
    ['a missing document', [{ _index: 'logs-okta', _id: 'e1', found: false }]],
    [
      'a document the analyst cannot read',
      [{ _index: 'logs-okta', _id: 'e1', error: { type: 'security_exception' } }],
    ],
  ])('rejects %s', async (_label, docs) => {
    await expect(
      prepareEvidence({
        esClient: esClient(docs),
        definition: raw,
        sessionId: 's1',
        context,
        selection: [{ kind: 'raw_event', index: 'logs-okta', id: 'e1' }],
      })
    ).rejects.toMatchObject({ reason: 'document_unavailable' });
  });
});

describe('prepareEvidence for an aggregate hunt', () => {
  const run = (overrides: Partial<PreservationContext> = {}, sessionId = 's1') =>
    prepareEvidence({
      esClient: esClient([]),
      definition: aggregate,
      sessionId,
      context: { ...context, ...overrides },
      selection: [{ kind: 'aggregate', values: { 'host.name': 'web-1', count: 4 } }],
    });

  it('stores the row as supplied, labelled as analyst supplied, without re-reading', async () => {
    const client = esClient([]);
    const result = await prepareEvidence({
      esClient: client,
      definition: aggregate,
      sessionId: 's1',
      context,
      selection: [{ kind: 'aggregate', values: { 'host.name': 'web-1', api_key: 'x' } }],
    });

    expect((client as unknown as { mget: jest.Mock }).mget).not.toHaveBeenCalled();
    expect(result.rows[0]).toEqual({
      'host.name': 'web-1',
      evidenceKind: AGGREGATE_EVIDENCE_LABEL,
    });
  });

  it('keeps provenance: a changed window or session gives a new fingerprint, a repeat does not', async () => {
    const [base, repeat, otherWindow, otherSession] = await Promise.all([
      run(),
      run(),
      run({ timeRange: { from: 'now-1d', to: 'now' } }),
      run({}, 's2'),
    ]);

    expect(repeat.fingerprints).toEqual(base.fingerprints);
    expect(otherWindow.fingerprints).not.toEqual(base.fingerprints);
    expect(otherSession.fingerprints).not.toEqual(base.fingerprints);
  });
});

describe('prepareEvidence selection rules', () => {
  it('rejects an empty selection and one over 50 rows', async () => {
    const args = { esClient: esClient([]), definition: aggregate, sessionId: 's1', context };

    await expect(prepareEvidence({ ...args, selection: [] })).rejects.toMatchObject({
      reason: 'no_rows',
    });
    await expect(
      prepareEvidence({
        ...args,
        selection: Array.from({ length: 51 }, () => ({ kind: 'aggregate' as const, values: {} })),
      })
    ).rejects.toMatchObject({ reason: 'too_many_rows' });
  });

  it('rejects rows of the wrong kind for the hunt', async () => {
    await expect(
      prepareEvidence({
        esClient: esClient([]),
        definition: raw,
        sessionId: 's1',
        context,
        selection: [{ kind: 'aggregate', values: { a: 1 } }],
      })
    ).rejects.toMatchObject({ reason: 'wrong_result_kind' });
  });
});
