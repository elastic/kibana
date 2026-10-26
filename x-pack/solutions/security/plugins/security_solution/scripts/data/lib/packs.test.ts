/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { listPacks, getPack } from '../packs';
import {
  assertPackProvenanceAuthored,
  buildPackIndexTemplate,
  cleanPackData,
  DATA_GENERATOR_FP_TAG,
  DATA_GENERATOR_TAG,
  ensureEcsSourceIp,
  ensurePackDataStream,
  huntRuleId,
  legacyDottedPackIndexName,
  legacyPackIndexName,
  packIndexName,
  packRuleTags,
  packTag,
  parsePacksFlag,
  stampOwnershipTags,
} from './packs';
import { readNdjson } from './episodes';
import { enrichDocForGraph } from './graph_enrichment';
import { scriptsDataDir } from './indexing';
import * as ruleset from './ruleset';
import { HOSTS } from './entities';

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
  it('registers all expected packs', () => {
    expect(
      listPacks()
        .map((p) => p.id)
        .sort()
    ).toEqual(['aws-iam', 'github-actions', 'ip-fields', 'kubernetes', 'okta']);
  });

  it('uses authored fidelity and pinned provenance', () => {
    for (const pack of listPacks()) {
      expect(() => assertPackProvenanceAuthored(pack)).not.toThrow();
      expect(pack.eventSources[0]?.fidelity).toEqual('authored');
      // Packs ported from an upstream repo pin the source commit; authored-from-scratch packs omit it.
      if (pack.eventSources[0]?.upstreamCommit !== undefined) {
        expect(pack.eventSources[0].upstreamCommit).toMatch(/^[a-f0-9]{40}$/);
      }
    }
  });

  it('builds data stream names from the dataset (no generator token)', () => {
    expect(packIndexName({ dataStream: 'okta.system' })).toEqual('logs-okta.system-default');
    expect(packIndexName({ dataStream: 'aws.cloudtrail' })).toEqual('logs-aws.cloudtrail-default');
  });

  it('builds the dotted and generator legacy names used only by --clean', () => {
    const endMs = Date.parse('2026-07-13T00:00:00.000Z');
    expect(legacyDottedPackIndexName({ dataStream: 'okta.system', endMs })).toEqual(
      'logs-okta.system.2026.07.13'
    );
    expect(legacyPackIndexName({ packId: 'aws-iam', dataStream: 'aws.cloudtrail', endMs })).toEqual(
      'logs-generator.aws_iam.aws.cloudtrail.2026.07.13'
    );
  });

  it('shapes a data stream template above the built-in logs template', () => {
    const mappings = { properties: { '@timestamp': { type: 'date' as const } } };
    const template = buildPackIndexTemplate({ dataStream: 'okta.system', mappings });
    expect(template).toMatchObject({
      name: 'data-generator-pack-okta.system',
      index_patterns: ['logs-okta.system-*'],
      data_stream: {},
      composed_of: ['logs@mappings', 'logs@settings', 'ecs@mappings'],
      priority: 250,
      template: { mappings },
    });
  });

  it.each(listPacks().map((pack) => [pack.id, pack.eventSources[0].dataStream]))(
    'writes %s events whose data_stream fields match the stream it is written to',
    async (packId, dataStream) => {
      const events = await readNdjson(path.join(scriptsDataDir('packs', packId), 'events.ndjson'));
      const name = packIndexName({ dataStream });
      for (const doc of events) {
        const ds = doc.data_stream as { type: string; dataset: string; namespace: string };
        expect(`${ds.type}-${ds.dataset}-${ds.namespace}`).toEqual(name);
      }
    }
  );

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

describe('ensurePackDataStream', () => {
  const log = new ToolingLog({ level: 'silent', writeTo: { write: () => {} } });

  const createEsClient = ({ createDataStream }: { createDataStream: jest.Mock }) => {
    const putIndexTemplate = jest.fn().mockResolvedValue({ acknowledged: true });
    const count = jest.fn().mockResolvedValue({ count: 0 });
    const esClient = {
      indices: { putIndexTemplate, createDataStream },
      count,
    } as unknown as Client;
    return { esClient, putIndexTemplate, createDataStream };
  };

  it('puts the template before creating the stream and returns the stream name', async () => {
    const { esClient, putIndexTemplate, createDataStream } = createEsClient({
      createDataStream: jest.fn().mockResolvedValue({ acknowledged: true }),
    });

    const name = await ensurePackDataStream({ esClient, dataStream: 'okta.system', log });

    expect(name).toEqual('logs-okta.system-default');
    expect(putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'data-generator-pack-okta.system', data_stream: {} })
    );
    expect(createDataStream).toHaveBeenCalledWith({ name: 'logs-okta.system-default' });
    expect(putIndexTemplate.mock.invocationCallOrder[0]).toBeLessThan(
      createDataStream.mock.invocationCallOrder[0]
    );
  });

  it('treats an already existing data stream as success', async () => {
    const { esClient } = createEsClient({
      createDataStream: jest.fn().mockRejectedValue(
        Object.assign(new Error('resource_already_exists_exception'), {
          statusCode: 400,
          meta: { statusCode: 400 },
        })
      ),
    });

    await expect(
      ensurePackDataStream({ esClient, dataStream: 'okta.system', log })
    ).resolves.toEqual('logs-okta.system-default');
  });

  it('rethrows any other create failure', async () => {
    const { esClient } = createEsClient({
      createDataStream: jest
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('boom'), { statusCode: 500, meta: { statusCode: 500 } })
        ),
    });

    await expect(
      ensurePackDataStream({ esClient, dataStream: 'okta.system', log })
    ).rejects.toThrow('boom');
  });
});

describe('cleanPackData', () => {
  const log = new ToolingLog({ level: 'silent', writeTo: { write: () => {} } });
  const startMs = Date.parse('2026-07-12T00:00:00.000Z');
  const endMs = Date.parse('2026-07-13T00:00:00.000Z');

  it('deletes the data stream, then its template, then legacy indices', async () => {
    const calls: string[] = [];
    const deleteDataStream = jest.fn().mockImplementation(async () => calls.push('stream'));
    const deleteIndexTemplate = jest.fn().mockImplementation(async () => calls.push('template'));
    const deleteIndices = jest.fn().mockImplementation(async () => calls.push('legacy'));
    const esClient = {
      indices: { deleteDataStream, deleteIndexTemplate, delete: deleteIndices },
    } as unknown as Client;
    jest.spyOn(ruleset, 'findGeneratorPackRules').mockResolvedValue([]);

    await cleanPackData({
      esClient,
      kbnClient: {} as never,
      log,
      packIds: ['okta'],
      startMs,
      endMs,
    });

    expect(calls).toEqual(['stream', 'template', 'legacy']);
    expect(deleteDataStream).toHaveBeenCalledWith(
      { name: 'logs-okta.system-default' },
      { ignore: [404] }
    );
    expect(deleteIndexTemplate).toHaveBeenCalledWith(
      { name: 'data-generator-pack-okta.system' },
      { ignore: [404] }
    );
    expect(deleteIndices).toHaveBeenCalledWith({
      index: [
        'logs-okta.system.2026.07.12',
        'logs-generator.okta.okta.system.2026.07.12',
        'logs-okta.system.2026.07.13',
        'logs-generator.okta.okta.system.2026.07.13',
      ],
      ignore_unavailable: true,
    });
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

describe('aws-iam AssumeRole hunt (Phase 5 technique closure)', () => {
  it('registers exactly six aws-iam hunts including AssumeRole with T1078.004', () => {
    const awsIam = getPack('aws-iam');
    expect(awsIam).toBeDefined();
    expect(awsIam!.hunts).toHaveLength(6);

    const assumeRole = awsIam!.hunts.find((h) => h.name === 'AssumeRole');
    expect(assumeRole).toBeDefined();
    expect(assumeRole?.query).toEqual('event.action: "AssumeRole" and cloud.provider: "aws"');
    expect(assumeRole?.mitre.map((m) => m.technique)).toEqual(['T1078.004']);
  });
});

describe('aws-iam AssumeRole host pin (DC2 entity join)', () => {
  const PINNED_HOST = 'WIN-ANALYST01';

  it('pins the PINNED_HOST catalog host to every AssumeRole event', async () => {
    expect(HOSTS[PINNED_HOST]).toBeDefined();

    const eventsPath = path.join(scriptsDataDir('packs', 'aws-iam'), 'events.ndjson');
    const events = await readNdjson(eventsPath);
    const assumeRoleEvents = events.filter(
      (doc) => (doc.event as { action?: string } | undefined)?.action === 'AssumeRole'
    );
    // Two original DC2 events plus two behavior-only events (event.provider / event_name).
    expect(assumeRoleEvents).toHaveLength(4);
    for (const doc of assumeRoleEvents) {
      expect((doc.host as { name?: string } | undefined)?.name).toEqual(PINNED_HOST);
      expect((doc.host as { id?: string } | undefined)?.id).toBeUndefined();
    }

    // No other aws-iam event carries a host, keeping CloudTrail lookup-only elsewhere.
    const hostBearing = events.filter((doc) => doc.host !== undefined);
    expect(hostBearing).toHaveLength(4);
  });

  it('adds event.provider and aws.cloudtrail.event_name only on the behavior-only AssumeRole rows', async () => {
    const eventsPath = path.join(scriptsDataDir('packs', 'aws-iam'), 'events.ndjson');
    const events = await readNdjson(eventsPath);
    const withProvider = events.filter(
      (doc) => (doc.event as { provider?: string } | undefined)?.provider === 'sts.amazonaws.com'
    );
    expect(withProvider).toHaveLength(2);
    for (const doc of withProvider) {
      expect((doc.event as { action?: string } | undefined)?.action).toEqual('AssumeRole');
      expect(
        (doc.aws as { cloudtrail?: { event_name?: string } } | undefined)?.cloudtrail?.event_name
      ).toEqual('AssumeRole');
      expect((doc.host as { name?: string } | undefined)?.name).toEqual(PINNED_HOST);
    }
  });

  it('lets enrichDocForGraph populate related.hosts from the pinned host', async () => {
    const eventsPath = path.join(scriptsDataDir('packs', 'aws-iam'), 'events.ndjson');
    const events = await readNdjson(eventsPath);
    const assumeRoleEvents = events.filter(
      (doc) => (doc.event as { action?: string } | undefined)?.action === 'AssumeRole'
    );
    for (const doc of assumeRoleEvents) {
      enrichDocForGraph(doc);
      expect((doc.related as { hosts?: string[] } | undefined)?.hosts).toEqual([PINNED_HOST]);
    }
  });
});

/**
 * Plan 11's isolate-host pattern for the three non-aws-iam Technology Watch packs: pin an
 * existing HOSTS catalog entry to the actor whose actions the pack's hunts target, so Hunt
 * Watch's SSE host-entity extraction has a Fleet-resolvable name to isolate. Lookup-only
 * (no host.id), same convention as aws-iam's DC2 pin.
 */
describe.each([
  {
    packId: 'okta',
    pinnedHost: 'ADMIN-WS02',
    // it-admin@corp.example also has a legitimate, differently-sourced session (192.0.2.10)
    // earlier in the story; only the takeover-IP actions get the host pin.
    matches: (doc: Record<string, unknown>) =>
      (doc.user as { name?: string } | undefined)?.name === 'it-admin@corp.example' &&
      (doc.source as { ip?: string } | undefined)?.ip === '192.0.2.50',
    expectedCount: 7,
  },
  {
    packId: 'kubernetes',
    pinnedHost: 'ci-runner-03',
    matches: (doc: Record<string, unknown>) =>
      (doc.user as { name?: string } | undefined)?.name ===
      'system:serviceaccount:default:compromised-sa',
    expectedCount: 14,
  },
  {
    packId: 'github-actions',
    pinnedHost: 'DEV-BUILD03',
    matches: (doc: Record<string, unknown>) =>
      (doc.user as { name?: string } | undefined)?.name === 'dev-contractor-42',
    expectedCount: 14,
  },
])('$packId host pin (isolate-host pattern)', ({ packId, pinnedHost, matches, expectedCount }) => {
  it('pins an existing HOSTS catalog entry to every event from the targeted actor', async () => {
    expect(HOSTS[pinnedHost]).toBeDefined();

    const eventsPath = path.join(scriptsDataDir('packs', packId), 'events.ndjson');
    const events = await readNdjson(eventsPath);
    const actorEvents = events.filter(matches);
    expect(actorEvents).toHaveLength(expectedCount);
    for (const doc of actorEvents) {
      expect((doc.host as { name?: string } | undefined)?.name).toEqual(pinnedHost);
      expect((doc.host as { id?: string } | undefined)?.id).toBeUndefined();
    }

    // No other event in this pack carries a host.
    const hostBearing = events.filter((doc) => doc.host !== undefined);
    expect(hostBearing).toHaveLength(expectedCount);
  });

  it('lets enrichDocForGraph populate related.hosts from the pinned host', async () => {
    const eventsPath = path.join(scriptsDataDir('packs', packId), 'events.ndjson');
    const events = await readNdjson(eventsPath);
    const actorEvents = events.filter(matches);
    for (const doc of actorEvents) {
      enrichDocForGraph(doc);
      expect((doc.related as { hosts?: string[] } | undefined)?.hosts).toEqual([pinnedHost]);
    }
  });
});
