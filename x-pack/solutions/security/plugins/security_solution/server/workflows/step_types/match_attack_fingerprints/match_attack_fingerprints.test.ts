/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { getAlertEntities } from '../get_alert_entities_step/get_alert_entities';
import {
  ATTACK_FINGERPRINT_INDEX,
  FingerprintIndexUnreadError,
  matchAttackFingerprints,
  reviewsWhenMatchFails,
} from './match_attack_fingerprints';
import { matchAttackFingerprintsStepDefinition } from './match_attack_fingerprints_step';

jest.mock('../get_alert_entities_step/get_alert_entities', () => ({
  getAlertEntities: jest.fn(),
}));

const getAlertEntitiesMock = getAlertEntities as jest.MockedFunction<typeof getAlertEntities>;

const ATTACK_ID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER_ATTACK_ID = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const attackDocument = (attackId: string, alertIds: string[]) => ({
  'kibana.alert.uuid': attackId,
  'kibana.alert.attack_discovery.title': 'Lateral movement',
  'kibana.alert.attack_discovery.summary_markdown': 'A summary',
  'kibana.alert.attack_discovery.alert_ids': alertIds,
  'kibana.alert.attack_discovery.mitre_attack_tactics': ['TA0008'],
});

const fingerprintHit = (
  overrides: Record<string, unknown> = {},
  expiresAt = '2026-10-22T12:00:00.000Z'
) => ({
  _id: 'stored-fp',
  _source: {
    id: 'stored-fp',
    type: 'security.attack_fingerprint',
    expires_at: expiresAt,
    attributes: {
      investigation_id: '11111111-1111-8111-8111-111111111111',
      alert_ids: ['a1', 'a2'],
      host_entity_ids: ['host-1'],
      user_entity_ids: ['user-1'],
      mitre_attack_tactics: ['TA0008'],
      first_alert_at: '2026-10-21T10:00:00.000Z',
      last_alert_at: '2026-10-21T10:30:00.000Z',
      ...overrides,
    },
  },
});

const logger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as StepHandlerContext['logger'];

const createHarness = ({
  hits = [] as unknown[],
  alertHits = [] as unknown[],
  index = jest.fn().mockResolvedValue({ result: 'created' }),
  get = jest.fn(),
  update = jest.fn().mockResolvedValue({ result: 'updated' }),
  conversation = { metadata: { status: 'open', close_reason: '', verdict: '' } },
} = {}) => {
  const search = jest.fn(async (params: { index?: string; size?: number }) => {
    if (params.index === ATTACK_FINGERPRINT_INDEX) {
      return { hits: { hits } };
    }
    if ((params.size ?? 0) > 0) {
      return { hits: { hits: alertHits } };
    }
    return {
      aggregations: {
        first: { value_as_string: '2026-10-21T10:00:00.000Z' },
        last: { value_as_string: '2026-10-21T10:30:00.000Z' },
      },
    };
  });
  const callKibanaApi = jest.fn(async () => ({ body: conversation }));
  const esClient = { search, index, get, update } as unknown as ElasticsearchClient;
  const contextManager = { callKibanaApi } as unknown as StepHandlerContext['contextManager'];
  return { callKibanaApi, esClient, contextManager, index, search, update };
};

describe('matchAttackFingerprints', () => {
  beforeEach(() => {
    getAlertEntitiesMock.mockResolvedValue({
      entities: [
        { id: 'host-1', type: 'host' },
        { id: 'user-1', type: 'user' },
      ],
      total: 2,
      truncated: false,
    });
  });

  it('returns a review and writes a fingerprint when nothing similar is stored', async () => {
    const { esClient, contextManager, index } = createHarness();

    const output = await matchAttackFingerprints({
      attacks: [attackDocument(ATTACK_ID, ['a1', 'a2'])],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(output.reviews.map((review) => review.attack_discovery_id)).toEqual([ATTACK_ID]);
    expect(output.reviews[0]?.sibling_alert_ids).toEqual([]);
    expect(output.attachments).toEqual([]);
    expect(index).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ATTACK_FINGERPRINT_INDEX,
        op_type: 'create',
        document: expect.objectContaining({
          permissions: { kibana: { privileges: [{ space: 'default' }] } },
        }),
      }),
      expect.anything()
    );
  });

  it('returns an attachment and does not write when the stored attack shares its alerts', async () => {
    const { esClient, contextManager, index } = createHarness({
      hits: [fingerprintHit()],
      conversation: {
        metadata: { status: 'open', close_reason: '', verdict: 'Handed off to Forensics Watch' },
      },
    });

    const output = await matchAttackFingerprints({
      attacks: [attackDocument(ATTACK_ID, ['a1', 'a2', 'a3'])],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(output.reviews).toEqual([]);
    expect(output.attachments[0]?.journal_alerts_retired).toBe(true);
    expect(output.attachments[0]?.tag_correlated_alerts).toBe(true);
    expect(output.attachments[0]?.investigation_id).toBe('11111111-1111-8111-8111-111111111111');
    expect(index).not.toHaveBeenCalled();
  });

  it('returns an attachment for a later phase with new alerts and different tactics', async () => {
    const { esClient, contextManager, index } = createHarness({
      hits: [
        fingerprintHit({
          alert_ids: ['a1', 'a2'],
          mitre_attack_tactics: ['TA0001'],
          first_alert_at: '2026-10-21T04:00:00.000Z',
          last_alert_at: '2026-10-21T04:30:00.000Z',
        }),
      ],
    });

    const output = await matchAttackFingerprints({
      attacks: [
        {
          ...attackDocument(ATTACK_ID, ['c1', 'c2']),
          'kibana.alert.attack_discovery.mitre_attack_tactics': ['TA0010'],
        },
      ],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(output.attachments[0]?.investigation_id).toBe('11111111-1111-8111-8111-111111111111');
    expect(output.attachments[0]?.tag_correlated_alerts).toBe(true);
    expect(output.reviews).toEqual([]);
    expect(index).not.toHaveBeenCalled();
  });

  it('moves the fingerprint window forward to the latest phase', async () => {
    const { esClient, contextManager, update } = createHarness({
      hits: [
        fingerprintHit(
          {
            alert_ids: ['a1', 'a2'],
            first_alert_at: '2026-10-21T04:00:00.000Z',
            last_alert_at: '2026-10-21T04:30:00.000Z',
          },
          '2026-10-21T05:00:00.000Z'
        ),
      ],
    });

    await matchAttackFingerprints({
      attacks: [attackDocument(ATTACK_ID, ['r1', 'r2'])],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ATTACK_FINGERPRINT_INDEX,
        id: 'stored-fp',
        doc: expect.objectContaining({ expires_at: '2026-10-22T10:30:00.000Z' }),
      }),
      expect.anything()
    );
  });

  it('merges a fingerprint again after a version conflict', async () => {
    const update = jest
      .fn()
      .mockRejectedValueOnce({ statusCode: 409, message: 'version_conflict_engine_exception' })
      .mockResolvedValue({ result: 'updated' });
    const get = jest.fn().mockResolvedValue({
      _id: 'stored-fp',
      _seq_no: 4,
      _primary_term: 2,
      _source: {
        id: 'stored-fp',
        expires_at: '2026-10-22T12:00:00.000Z',
        attributes: {
          investigation_id: '11111111-1111-8111-8111-111111111111',
          alert_ids: ['a1', 'a2', 'kept'],
          host_entity_ids: ['host-1'],
          user_entity_ids: ['user-1'],
          mitre_attack_tactics: ['TA0008'],
          first_alert_at: '2026-10-21T04:00:00.000Z',
          last_alert_at: '2026-10-21T04:30:00.000Z',
        },
      },
    });
    const { esClient, contextManager } = createHarness({
      hits: [
        {
          ...fingerprintHit({ alert_ids: ['a1', 'a2'] }, '2026-10-21T05:00:00.000Z'),
          _seq_no: 1,
          _primary_term: 1,
        },
      ],
      update,
      get,
    });

    await matchAttackFingerprints({
      attacks: [attackDocument(ATTACK_ID, ['r1', 'r2'])],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        if_seq_no: 4,
        if_primary_term: 2,
        doc: expect.objectContaining({
          attributes: expect.objectContaining({ alert_ids: ['a1', 'a2', 'kept', 'r1', 'r2'] }),
        }),
      }),
      expect.anything()
    );
  });

  it('returns a linked review for a closed false positive with no shared alerts', async () => {
    const { esClient, contextManager } = createHarness({
      hits: [fingerprintHit({ alert_ids: ['old-1', 'old-2'] })],
      conversation: { metadata: { status: 'closed', close_reason: 'false_positive', verdict: '' } },
    });

    const output = await matchAttackFingerprints({
      attacks: [attackDocument(ATTACK_ID, ['new-1', 'new-2'])],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(output.reviews[0]?.related_investigation_id).toBe(
      '11111111-1111-8111-8111-111111111111'
    );
  });

  it('returns one review and one same-run attachment for two overlapping attacks', async () => {
    const { esClient, contextManager, index } = createHarness();

    const output = await matchAttackFingerprints({
      attacks: [
        attackDocument(OTHER_ATTACK_ID, ['a2', 'a3']),
        attackDocument(ATTACK_ID, ['a1', 'a2']),
      ],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(output.reviews.map((review) => review.attack_discovery_id)).toEqual([ATTACK_ID]);
    expect(output.reviews[0]?.sibling_alert_ids).toEqual(['a3']);
    expect(output.attachments[0]?.journal_alerts_retired).toBe(false);
    expect(output.attachments[0]?.tag_correlated_alerts).toBe(false);
    expect(index).toHaveBeenCalledTimes(1);
  });

  it('returns an attachment when the fingerprint create conflicts', async () => {
    const index = jest.fn().mockRejectedValue({ statusCode: 409, message: 'conflict' });
    const get = jest.fn().mockResolvedValue({
      _id: 'stored-fp',
      _source: {
        id: 'stored-fp',
        attributes: {
          investigation_id: '22222222-2222-8222-8222-222222222222',
          alert_ids: ['a1', 'a2'],
          host_entity_ids: ['host-1'],
          user_entity_ids: ['user-1'],
          mitre_attack_tactics: ['TA0008'],
          first_alert_at: '2026-10-21T10:00:00.000Z',
          last_alert_at: '2026-10-21T10:30:00.000Z',
        },
      },
    });
    const { esClient, contextManager } = createHarness({
      index,
      get,
      conversation: { metadata: { status: 'closed', close_reason: 'other', verdict: '' } },
    });

    const output = await matchAttackFingerprints({
      attacks: [attackDocument(ATTACK_ID, ['a1', 'a2'])],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(output.attachments[0]?.investigation_id).toBe('22222222-2222-8222-8222-222222222222');
    expect(output.reviews).toEqual([]);
  });

  it('keeps attacks on different host names apart when they share one entity id', async () => {
    getAlertEntitiesMock.mockImplementation(async ({ alertIds }) => {
      const host = alertIds.includes('win01-a') ? 'SRVWIN01' : 'SRVWIN02';
      return {
        entities: [
          { id: 'host:shared-host-id', name: host, type: 'host' },
          {
            id: 'user:Administrator@shared-host-id@local',
            name: `Administrator@${host}`,
            type: 'user',
          },
        ],
        total: 2,
        truncated: false,
      };
    });
    const { esClient, contextManager, index } = createHarness();

    const output = await matchAttackFingerprints({
      attacks: [
        attackDocument(ATTACK_ID, ['win01-a', 'win01-b']),
        attackDocument(OTHER_ATTACK_ID, ['win02-a', 'win02-b']),
      ],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(output.reviews.map((review) => review.attack_discovery_id).sort()).toEqual(
      [ATTACK_ID, OTHER_ATTACK_ID].sort()
    );
    expect(output.attachments).toEqual([]);
    expect(index).toHaveBeenCalledTimes(2);
  });

  it('queries every host when the run has more than one terms batch', async () => {
    getAlertEntitiesMock.mockImplementation(async ({ alertIds }) => {
      const host = `host-${alertIds[0]}`;
      return {
        entities: [
          { id: host, name: host, type: 'host' },
          { id: 'user-1', name: 'user-1', type: 'user' },
        ],
        total: 2,
        truncated: false,
      };
    });
    const { esClient, contextManager, search } = createHarness();
    const attacks = Array.from({ length: 101 }, (_, index) =>
      attackDocument(index.toString(16).padStart(64, '0'), [`alert-${index}`])
    );

    await matchAttackFingerprints({
      attacks,
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    const hosts = search.mock.calls.flatMap((call) => {
      const filters = (
        call[0] as { query?: { bool?: { filter?: Array<Record<string, unknown>> } } }
      ).query?.bool?.filter;
      return (filters ?? []).flatMap(
        (filter) =>
          (filter.terms as { 'attributes.host_entity_ids'?: string[] } | undefined)?.[
            'attributes.host_entity_ids'
          ] ?? []
      );
    });

    expect(hosts).toHaveLength(101);
  });

  it('attaches when the matching fingerprint is on the second page', async () => {
    const noise = Array.from({ length: 100 }, (_, index) => {
      const id = `noise-${index}`;
      const hit = fingerprintHit({
        alert_ids: [`other-${index}-a`, `other-${index}-b`],
        host_entity_ids: [`other-host-${index}`],
        user_entity_ids: [`other-user-${index}`],
      });
      return {
        ...hit,
        _id: id,
        _source: { ...hit._source, id },
        sort: ['2026-10-22T12:00:00.000Z', id],
      };
    });
    const match = {
      ...fingerprintHit(),
      sort: ['2026-10-22T11:00:00.000Z', 'stored-fp'],
    };
    const search = jest.fn(async (params: { index?: string; search_after?: unknown }) => {
      if (params.index !== ATTACK_FINGERPRINT_INDEX) {
        return {
          aggregations: {
            first: { value_as_string: '2026-10-21T10:00:00.000Z' },
            last: { value_as_string: '2026-10-21T10:30:00.000Z' },
          },
        };
      }
      return { hits: { hits: params.search_after === undefined ? noise : [match] } };
    });
    const esClient = {
      search,
      index: jest.fn(),
      get: jest.fn(),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    } as unknown as ElasticsearchClient;
    const contextManager = {
      callKibanaApi: jest.fn(async () => ({
        body: { metadata: { status: 'open', close_reason: '', verdict: '' } },
      })),
    } as unknown as StepHandlerContext['contextManager'];

    const output = await matchAttackFingerprints({
      attacks: [attackDocument(ATTACK_ID, ['a1', 'a2'])],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(output.reviews).toEqual([]);
    expect(output.attachments[0]?.investigation_id).toBe('11111111-1111-8111-8111-111111111111');
  });

  it('writes the host name and the de-anonymized summary, and leaves the review anonymized', async () => {
    getAlertEntitiesMock.mockResolvedValue({
      entities: [
        { id: 'host:shared-host-id', name: 'SRVWIN01', type: 'host' },
        {
          id: 'user:Administrator@shared-host-id@local',
          name: 'Administrator@SRVWIN01',
          type: 'user',
        },
      ],
      total: 2,
      truncated: false,
    });
    const { esClient, contextManager, index } = createHarness();

    const output = await matchAttackFingerprints({
      attacks: [
        {
          ...attackDocument(ATTACK_ID, ['a1', 'a2']),
          'kibana.alert.attack_discovery.title': 'Excel on {{ host.name uuid }}',
          'kibana.alert.attack_discovery.title_with_replacements': 'Excel on SRVWIN01',
          'kibana.alert.attack_discovery.summary_markdown':
            'Excel on {{ host.name uuid }} decoded a file.',
          'kibana.alert.attack_discovery.summary_markdown_with_replacements':
            'Excel on SRVWIN01 decoded a file.',
        },
      ],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(output.reviews[0]?.summary_markdown).toBe(
      'Excel on {{ host.name uuid }} decoded a file.'
    );
    expect(index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({
          title: 'Excel on SRVWIN01',
          attributes: expect.objectContaining({
            host_entity_ids: ['SRVWIN01'],
            user_entity_ids: ['Administrator@SRVWIN01'],
          }),
        }),
      }),
      expect.anything()
    );
    const written = index.mock.calls[0]?.[0] as { document: { content?: string } };
    expect(written.document.content).toBeUndefined();
  });

  it('keeps a linked review when the closed false positive already owns the fingerprint id', async () => {
    const index = jest
      .fn()
      .mockRejectedValueOnce({ statusCode: 409, message: 'conflict' })
      .mockResolvedValue({ result: 'created' });
    const { esClient, contextManager } = createHarness({
      hits: [fingerprintHit({ alert_ids: ['old-1', 'old-2'] })],
      index,
      get: jest.fn().mockResolvedValue({
        _id: 'stored-fp',
        _source: {
          id: 'stored-fp',
          attributes: {
            investigation_id: '11111111-1111-8111-8111-111111111111',
            alert_ids: ['old-1', 'old-2'],
            host_entity_ids: ['host-1'],
            user_entity_ids: ['user-1'],
            mitre_attack_tactics: ['TA0008'],
            first_alert_at: '2026-10-21T10:00:00.000Z',
            last_alert_at: '2026-10-21T10:30:00.000Z',
          },
        },
      }),
      conversation: { metadata: { status: 'closed', close_reason: 'false_positive', verdict: '' } },
    });

    const output = await matchAttackFingerprints({
      attacks: [attackDocument(ATTACK_ID, ['new-1', 'new-2'])],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(output.attachments).toEqual([]);
    expect(output.reviews[0]?.related_investigation_id).toBe(
      '11111111-1111-8111-8111-111111111111'
    );
  });

  it('does not attach a later host-only attack when the fingerprint id collides', async () => {
    getAlertEntitiesMock.mockResolvedValue({
      entities: [{ id: 'host-1', name: 'host-1', type: 'host' }],
      total: 1,
      truncated: false,
    });
    const index = jest
      .fn()
      .mockRejectedValueOnce({ statusCode: 409, message: 'conflict' })
      .mockResolvedValue({ result: 'created' });
    const { esClient, contextManager } = createHarness({
      index,
      get: jest.fn().mockResolvedValue({
        _id: 'stored-fp',
        _source: {
          id: 'stored-fp',
          attributes: {
            investigation_id: '11111111-1111-8111-8111-111111111111',
            alert_ids: ['old-1', 'old-2'],
            host_entity_ids: ['host-1'],
            user_entity_ids: [],
            mitre_attack_tactics: ['TA0008'],
            first_alert_at: '2026-10-21T10:00:00.000Z',
            last_alert_at: '2026-10-21T10:30:00.000Z',
          },
        },
      }),
    });

    const output = await matchAttackFingerprints({
      attacks: [attackDocument(ATTACK_ID, ['new-1', 'new-2'])],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(output.attachments).toEqual([]);
    expect(output.reviews).toHaveLength(1);
  });

  it('reviews a match whose Investigation was never created', async () => {
    const index = jest.fn().mockResolvedValue({ result: 'created' });
    const { esClient, contextManager } = createHarness({
      hits: [fingerprintHit()],
      index,
    });
    (contextManager.callKibanaApi as jest.Mock).mockRejectedValue(
      new KibanaApiCallError({
        status: 404,
        headers: {},
        body: {},
        message: 'Not Found',
      })
    );

    const output = await matchAttackFingerprints({
      attacks: [attackDocument(ATTACK_ID, ['a1', 'a2'])],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(output.attachments).toEqual([]);
    expect(output.reviews).toHaveLength(1);
  });

  it('attaches when the winning run has not created the Investigation yet', async () => {
    const now = new Date('2026-10-21T12:00:00.000Z');
    const index = jest.fn().mockRejectedValue({ statusCode: 409, message: 'conflict' });
    const { esClient, contextManager } = createHarness({
      index,
      get: jest.fn().mockResolvedValue({
        _id: 'stored-fp',
        _source: {
          id: 'stored-fp',
          '@timestamp': now.toISOString(),
          attributes: {
            investigation_id: '11111111-1111-8111-8111-111111111111',
            alert_ids: ['old-1', 'old-2'],
            host_entity_ids: ['host-1'],
            user_entity_ids: ['user-1'],
            mitre_attack_tactics: ['TA0008'],
            first_alert_at: '2026-10-21T10:00:00.000Z',
            last_alert_at: '2026-10-21T10:30:00.000Z',
          },
        },
      }),
    });
    (contextManager.callKibanaApi as jest.Mock).mockRejectedValue(
      new KibanaApiCallError({ status: 404, headers: {}, body: {}, message: 'Not Found' })
    );

    const output = await matchAttackFingerprints({
      attacks: [attackDocument(ATTACK_ID, ['new-1', 'new-2'])],
      contextManager,
      esClient,
      logger,
      now,
      spaceId: 'default',
    });

    expect(output.reviews).toEqual([]);
    expect(output.attachments[0]?.investigation_id).toBe('11111111-1111-8111-8111-111111111111');
    expect(index).toHaveBeenCalledTimes(1);
  });

  it('saves the host and user pairs read from the alerts', async () => {
    const { esClient, contextManager, index } = createHarness({
      alertHits: [
        { fields: { 'host.name': ['repro-host-8a'], 'user.name': ['root'] } },
        { fields: { 'host.name': ['repro-host-8b'], 'user.name': ['deploy'] } },
      ],
    });

    await matchAttackFingerprints({
      attacks: [attackDocument(ATTACK_ID, ['repro-8-1', 'repro-8-2'])],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({
          attributes: expect.objectContaining({
            entity_pairs: ['deploy@repro-host-8b', 'root@repro-host-8a'],
          }),
        }),
      }),
      expect.anything()
    );
  });

  it('merges a new host and user pair into the saved fingerprint', async () => {
    const { esClient, contextManager, update } = createHarness({
      hits: [fingerprintHit({ entity_pairs: ['user-1@host-1'] })],
      alertHits: [
        { fields: { 'host.name': ['host-1'], 'user.name': ['user-1'] } },
        { fields: { 'host.name': ['host-1'], 'user.name': ['user-2'] } },
      ],
    });

    await matchAttackFingerprints({
      attacks: [attackDocument(ATTACK_ID, ['n1', 'n2'])],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: expect.objectContaining({
          attributes: expect.objectContaining({
            entity_pairs: ['user-1@host-1', 'user-2@host-1'],
          }),
        }),
      }),
      expect.anything()
    );
  });

  it('keeps the stored alert count when the saved id list is capped', async () => {
    const { esClient, contextManager, update } = createHarness({
      hits: [fingerprintHit({ alert_ids: ['a1', 'a2'], alert_count: 150 })],
    });

    await matchAttackFingerprints({
      attacks: [attackDocument(ATTACK_ID, ['n1', 'n2'])],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: expect.objectContaining({
          attributes: expect.objectContaining({ alert_count: 152 }),
        }),
      }),
      expect.anything()
    );
  });

  it('does not attach a service account that was never seen on that host', async () => {
    getAlertEntitiesMock.mockResolvedValue({
      entities: [
        { id: 'repro-host-8b', name: 'repro-host-8b', type: 'host' },
        { id: 'root', name: 'root', type: 'user' },
      ],
      total: 2,
      truncated: false,
    });
    const { esClient, contextManager } = createHarness({
      hits: [
        fingerprintHit({
          alert_ids: ['repro-8-1', 'repro-8-2'],
          host_entity_ids: ['repro-host-8a', 'repro-host-8b'],
          user_entity_ids: ['deploy', 'root'],
          entity_pairs: ['root@repro-host-8a', 'deploy@repro-host-8b'],
        }),
      ],
      alertHits: [{ fields: { 'host.name': ['repro-host-8b'], 'user.name': ['root'] } }],
    });

    const output = await matchAttackFingerprints({
      attacks: [
        {
          ...attackDocument(ATTACK_ID, ['repro-8-3']),
          'kibana.alert.attack_discovery.mitre_attack_tactics': ['TA0003'],
        },
      ],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(output.attachments).toEqual([]);
    expect(output.reviews).toHaveLength(1);
  });

  it('reviews every attack when matching throws', async () => {
    const result = await matchAttackFingerprintsStepDefinition.handler({
      abortSignal: new AbortController().signal,
      input: { attacks: [attackDocument(ATTACK_ID, ['a1', 'a2'])] },
      logger,
      contextManager: {
        getScopedEsClient: () => {
          throw new Error('elasticsearch unavailable');
        },
      },
    } as never);

    expect(reviewsWhenMatchFails([attackDocument(ATTACK_ID, ['a1'])])).toEqual({
      reviews: [
        expect.objectContaining({
          attack_discovery_id: ATTACK_ID,
          related_investigation_id: '',
          sibling_alert_ids: [],
        }),
      ],
      attachments: [],
    });
    expect(result).toEqual({
      output: {
        reviews: [
          expect.objectContaining({
            attack_discovery_id: ATTACK_ID,
            related_investigation_id: '',
          }),
        ],
        attachments: [],
      },
    });
  });

  it('reviews every attack and writes nothing when the fingerprint index was not read', async () => {
    const index = jest.fn();
    const search = jest.fn(async (params: { index?: string; size?: number }) => {
      if (params.index === ATTACK_FINGERPRINT_INDEX) {
        return { _shards: { total: 0 }, hits: { hits: [] } };
      }
      if ((params.size ?? 0) > 0) {
        return { hits: { hits: [] } };
      }
      return {
        aggregations: {
          first: { value_as_string: '2026-10-21T10:00:00.000Z' },
          last: { value_as_string: '2026-10-21T10:30:00.000Z' },
        },
      };
    });

    const result = await matchAttackFingerprintsStepDefinition.handler({
      abortSignal: new AbortController().signal,
      input: { attacks: [attackDocument(ATTACK_ID, ['a1', 'a2'])] },
      logger,
      contextManager: {
        getScopedEsClient: () => ({ search, index, get: jest.fn(), update: jest.fn() }),
        callKibanaApi: async () => ({ body: { id: 'default' } }),
        getContext: () => ({ workflow: { spaceId: 'default' } }),
      },
    } as never);

    expect(index).not.toHaveBeenCalled();
    expect(result).toEqual({
      output: {
        reviews: [
          expect.objectContaining({
            attack_discovery_id: ATTACK_ID,
            related_investigation_id: '',
            sibling_alert_ids: [],
          }),
        ],
        attachments: [],
      },
    });
  });

  it('does not write a fingerprint when the fingerprint search fails', async () => {
    const { esClient, contextManager, index } = createHarness();
    const search = (esClient as unknown as { search: jest.Mock }).search;
    search.mockImplementation(async (params: { index?: string; size?: number }) => {
      if (params.index === ATTACK_FINGERPRINT_INDEX) {
        throw new Error('security_exception');
      }
      if ((params.size ?? 0) > 0) {
        return { hits: { hits: [] } };
      }
      return {
        aggregations: {
          first: { value_as_string: '2026-10-21T10:00:00.000Z' },
          last: { value_as_string: '2026-10-21T10:30:00.000Z' },
        },
      };
    });

    await expect(
      matchAttackFingerprints({
        attacks: [attackDocument(ATTACK_ID, ['a1', 'a2'])],
        contextManager,
        esClient,
        logger,
        now: new Date('2026-10-21T12:00:00.000Z'),
        spaceId: 'default',
      })
    ).rejects.toBeInstanceOf(FingerprintIndexUnreadError);
    expect(index).not.toHaveBeenCalled();
  });

  it('writes a fingerprint when the index does not exist yet', async () => {
    const { esClient, contextManager, index } = createHarness();
    const search = (esClient as unknown as { search: jest.Mock }).search;
    search.mockImplementation(async (params: { index?: string; size?: number }) => {
      if (params.index === ATTACK_FINGERPRINT_INDEX) {
        throw new errors.ResponseError({
          statusCode: 404,
          body: { error: { type: 'index_not_found_exception' } },
          headers: {},
          warnings: [],
          meta: {} as never,
        });
      }
      if ((params.size ?? 0) > 0) {
        return { hits: { hits: [] } };
      }
      return {
        aggregations: {
          first: { value_as_string: '2026-10-21T10:00:00.000Z' },
          last: { value_as_string: '2026-10-21T10:30:00.000Z' },
        },
      };
    });

    const output = await matchAttackFingerprints({
      attacks: [attackDocument(ATTACK_ID, ['a1', 'a2'])],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(output.reviews).toHaveLength(1);
    expect(index).toHaveBeenCalled();
  });
});
