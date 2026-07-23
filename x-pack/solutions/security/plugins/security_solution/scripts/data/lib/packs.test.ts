/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { listPacks, getPack } from '../packs';
import {
  assertPackProvenanceAuthored,
  DATA_GENERATOR_FP_TAG,
  DATA_GENERATOR_TAG,
  ensureEcsSourceIp,
  huntRuleId,
  packIndexName,
  packRuleTags,
  packTag,
  parsePacksFlag,
  stampOwnershipTags,
} from './packs';

describe('parsePacksFlag', () => {
  it('returns empty for blank input', () => {
    expect(parsePacksFlag(undefined)).toEqual([]);
    expect(parsePacksFlag('')).toEqual([]);
  });

  it('parses known pack ids', () => {
    expect(parsePacksFlag('okta,aws-iam')).toEqual(['okta', 'aws-iam']);
  });

  it('throws on unknown pack ids', () => {
    expect(() => parsePacksFlag('fortigate')).toThrow(/Unknown --packs/);
  });
});

describe('Technology Watch packs', () => {
  it('registers the four MVP packs', () => {
    expect(
      listPacks()
        .map((p) => p.id)
        .sort()
    ).toEqual(['aws-iam', 'github-actions', 'kubernetes', 'okta']);
  });

  it('uses authored fidelity and pinned provenance', () => {
    for (const pack of listPacks()) {
      expect(() => assertPackProvenanceAuthored(pack)).not.toThrow();
      expect(pack.eventSources[0]?.fidelity).toEqual('authored');
      expect(pack.eventSources[0]?.upstreamCommit).toMatch(/^[a-f0-9]{40}$/);
    }
  });

  it('builds concrete pack index names from dataset (no generator token)', () => {
    expect(
      packIndexName({
        packId: 'okta',
        dataStream: 'okta.system',
        endMs: Date.parse('2026-07-13T00:00:00.000Z'),
      })
    ).toEqual('logs-okta.system.2026.07.13');
  });

  it('sanitizes hyphenated datasets so names do not match logs-*-*', () => {
    expect(
      packIndexName({
        packId: 'aws-iam',
        dataStream: 'aws.cloudtrail',
        endMs: Date.parse('2026-07-13T00:00:00.000Z'),
      })
    ).toEqual('logs-aws.cloudtrail.2026.07.13');
  });

  it('builds stable uuid hunt rule ids', () => {
    expect(huntRuleId('okta', 'Okta Login from New Geographic Location')).toEqual(
      '1d3e4400-82aa-505b-b0e7-d55f934c309c'
    );
  });

  it('keeps Okta compromise hunts on non-overlapping queries', () => {
    const okta = getPack('okta');
    expect(okta).toBeDefined();
    const mfa = okta!.hunts.find((h) => h.name.includes('MFA Factor Reset'));
    const multi = okta!.hunts.find((h) => h.name.includes('Multiple Okta Accounts'));
    expect(mfa?.query).toContain('user.mfa.factor.deactivate');
    expect(multi?.query).toContain('user.account.update_password');
    expect(mfa?.query).not.toEqual(multi?.query);
  });

  it('stamps ownership tags on true-positive pack docs', () => {
    const doc: Record<string, unknown> = { tags: ['okta'] };
    stampOwnershipTags(doc, { packId: 'okta' });
    expect(doc.tags).toEqual(expect.arrayContaining([DATA_GENERATOR_TAG, packTag('okta'), 'okta']));
    expect(doc.tags).not.toContain(DATA_GENERATOR_FP_TAG);
  });

  it('stamps data-generator-fp on false-positive pack docs', () => {
    const doc: Record<string, unknown> = {};
    stampOwnershipTags(doc, { packId: 'okta', isFalsePositive: true });
    expect(doc.tags).toEqual(
      expect.arrayContaining([DATA_GENERATOR_TAG, DATA_GENERATOR_FP_TAG, packTag('okta')])
    );
  });

  it('tags installed pack rules with ownership tags (not FP)', () => {
    const okta = getPack('okta');
    expect(okta).toBeDefined();
    expect(packRuleTags(okta!)).toEqual([DATA_GENERATOR_TAG, packTag('okta'), okta!.technology]);
  });

  it('keeps falsePositive templates free of embedded ownership tags until index time', () => {
    const okta = getPack('okta');
    expect(okta).toBeDefined();
    const fp = okta!.hunts.find((h) => (h.falsePositives?.length ?? 0) > 0)?.falsePositives?.[0];
    expect(fp).toBeDefined();
    expect(fp).not.toHaveProperty('tags');
    expect(fp).not.toHaveProperty('data_generator');
  });
});

describe('ensureEcsSourceIp', () => {
  it('copies related.ip into source.ip when source.ip is missing', () => {
    const doc: Record<string, unknown> = { related: { ip: ['192.0.2.60'] } };
    ensureEcsSourceIp(doc);
    expect((doc.source as { ip: string }).ip).toEqual('192.0.2.60');
  });

  it('copies kubernetes.audit.sourceIPs into source.ip when related.ip is absent', () => {
    const doc: Record<string, unknown> = {
      kubernetes: { audit: { sourceIPs: ['192.0.2.60'] } },
    };
    ensureEcsSourceIp(doc);
    expect((doc.source as { ip: string }).ip).toEqual('192.0.2.60');
  });

  it('leaves an existing source.ip unchanged', () => {
    const doc: Record<string, unknown> = {
      source: { ip: '192.0.2.30' },
      related: { ip: ['192.0.2.99'] },
    };
    ensureEcsSourceIp(doc);
    expect((doc.source as { ip: string }).ip).toEqual('192.0.2.30');
  });
});
