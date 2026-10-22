/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { getAlertEntities } from '../get_alert_entities_step/get_alert_entities';
import { ATTACK_FINGERPRINT_INDEX, matchAttackFingerprints } from './match_attack_fingerprints';

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
  index = jest.fn().mockResolvedValue({ result: 'created' }),
  get = jest.fn(),
  update = jest.fn().mockResolvedValue({ result: 'updated' }),
  conversation = { metadata: { status: 'open', close_reason: '', verdict: '' } },
} = {}) => {
  const search = jest.fn(async (params: { index?: string }) => {
    if (params.index === ATTACK_FINGERPRINT_INDEX) {
      return { hits: { hits } };
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
        document: expect.objectContaining({ content: expect.stringContaining('host:host-1') }),
      }),
      expect.anything()
    );
  });

  it('returns an attachment and does not write when the stored attack shares its alerts', async () => {
    const { esClient, contextManager, index } = createHarness({
      hits: [fingerprintHit()],
      conversation: { metadata: { status: 'open', verdict: 'Handed off to Forensics Watch' } },
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
      _source: { attributes: { investigation_id: '22222222-2222-8222-8222-222222222222' } },
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
          content: expect.stringContaining('host:SRVWIN01'),
          attributes: expect.objectContaining({
            host_entity_ids: ['SRVWIN01'],
            user_entity_ids: ['Administrator@SRVWIN01'],
          }),
        }),
      }),
      expect.anything()
    );
    const written = index.mock.calls[0]?.[0] as { document: { content: string } };
    expect(written.document.content).toContain('Excel on SRVWIN01 decoded a file.');
  });

  it('returns a review when the content write fails inference and the attribute write succeeds', async () => {
    const index = jest.fn(async (params: { document?: { content?: string } }) => {
      if (params.document?.content !== undefined) {
        throw new Error('inference timed out');
      }
      return { result: 'created' };
    });
    const { esClient, contextManager } = createHarness({ index });

    const output = await matchAttackFingerprints({
      attacks: [attackDocument(ATTACK_ID, ['a1', 'a2'])],
      contextManager,
      esClient,
      logger,
      now: new Date('2026-10-21T12:00:00.000Z'),
      spaceId: 'default',
    });

    expect(output.reviews).toHaveLength(1);
    expect(index).toHaveBeenLastCalledWith(
      expect.objectContaining({
        document: expect.not.objectContaining({ content: expect.anything() }),
      }),
      expect.anything()
    );
  });
});
