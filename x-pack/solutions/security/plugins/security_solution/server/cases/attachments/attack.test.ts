/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { AttachmentDeleteTarget } from '@kbn/cases-plugin/server';
import {
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
} from '@kbn/elastic-assistant-common';
import { getAttackOnDelete } from './attack';

const ATTACK_INDEX = '.alerts-security.attack.discovery.alerts-default';
/** What the attachment actually snapshots: the concrete backing index behind the alias. */
const ATTACK_BACKING_INDEX = '.internal.alerts-security.attack.discovery.alerts-default-000001';
const ATTACK_PATTERN = '.alerts-security.attack.discovery.alerts-*';
const AD_HOC_BACKING_INDEX =
  '.internal.adhoc.alerts-security.attack.discovery.alerts-default-000001';
const AD_HOC_PATTERN = '.adhoc.alerts-security.attack.discovery.alerts-*';

const attackTarget = (
  id: string,
  attackId: string,
  index: string = ATTACK_INDEX
): AttachmentDeleteTarget =>
  ({
    id,
    attributes: {
      type: SECURITY_ATTACK_ATTACHMENT_TYPE,
      attachmentId: attackId,
      owner: 'securitySolution',
      metadata: { title: attackId, alertCount: 1, index },
    },
  } as unknown as AttachmentDeleteTarget);

const ALERT_INDEX = '.alerts-security.alerts-default';

// `sourceAttachmentIds` is the provenance written when an attack attaches its alerts. Pass
// `null` for an attachment the analyst created themselves, which carries no provenance at all
// and must survive the attack's deletion.
const alertTarget = (
  id: string,
  alertIds: string[],
  sourceAttachmentIds: string[] | null = ['attack-1'],
  metadata: Record<string, unknown> = {}
): AttachmentDeleteTarget =>
  ({
    id,
    attributes: {
      type: SECURITY_ALERT_ATTACHMENT_TYPE,
      attachmentId: alertIds,
      owner: 'securitySolution',
      metadata: {
        index: ALERT_INDEX,
        ...(sourceAttachmentIds === null ? {} : { sourceAttachmentIds }),
        ...metadata,
      },
    },
  } as unknown as AttachmentDeleteTarget);

const attackHit = (
  id: string,
  alertIds: string[],
  replacements?: Array<{ uuid: string; value: string }>
) => ({
  _id: id,
  _index: ATTACK_INDEX,
  _source: {
    [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: alertIds,
    ...(replacements ? { [ALERT_ATTACK_DISCOVERY_REPLACEMENTS]: replacements } : {}),
  },
});

describe('getAttackOnDelete', () => {
  const request = httpServerMock.createKibanaRequest();
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let onDelete: ReturnType<typeof getAttackOnDelete>;

  const mockAttacks = (hits: Array<ReturnType<typeof attackHit>>) =>
    esClient.search.mockResolvedValue({
      hits: { hits },
    } as unknown as Awaited<ReturnType<typeof esClient.search>>);

  beforeEach(() => {
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const scopedClient = elasticsearchServiceMock.createScopedClusterClient();
    esClient = scopedClient.asCurrentUser;
    jest.mocked(coreStart.elasticsearch.client.asScoped).mockReturnValue(scopedClient);
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    onDelete = getAttackOnDelete({
      getStartServices: coreSetup.getStartServices,
      logger: loggerMock.create(),
    });
  });

  it('does not read the attacks when no alert attachment remains on the case', async () => {
    const result = await onDelete({
      caseId: 'case-1',
      request,
      attachments: [attackTarget('attack-att-1', 'attack-1')],
      remainingAttachments: [],
    });

    expect(result).toEqual({ relatedAttachmentIds: [] });
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('returns the alert attachments of the deleted attack, de-anonymising its alert ids', async () => {
    mockAttacks([
      attackHit(
        'attack-1',
        ['anon-1', 'anon-2'],
        [
          { uuid: 'anon-1', value: 'alert-1' },
          { uuid: 'anon-2', value: 'alert-2' },
        ]
      ),
    ]);

    const result = await onDelete({
      caseId: 'case-1',
      request,
      attachments: [attackTarget('attack-att-1', 'attack-1')],
      remainingAttachments: [
        alertTarget('alert-att-1', ['alert-1', 'alert-2']),
        alertTarget('alert-att-2', ['alert-3']),
      ],
    });

    expect(result).toEqual({
      relatedAttachmentIds: ['alert-att-1'],
      // `alert-3` has since left the attack, so it stays, no longer attributed to any attack.
      relatedAttachmentUpdates: [
        {
          id: 'alert-att-2',
          payload: {
            type: SECURITY_ALERT_ATTACHMENT_TYPE,
            owner: 'securitySolution',
            attachmentId: ['alert-3'],
            metadata: { index: ALERT_INDEX, sourceAttachmentIds: [] },
          },
        },
      ],
    });
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ATTACK_PATTERN,
        query: { ids: { values: ['attack-1'] } },
      })
    );
  });

  it.each([
    ['scheduled', ATTACK_BACKING_INDEX, ATTACK_PATTERN],
    ['ad hoc', AD_HOC_BACKING_INDEX, AD_HOC_PATTERN],
  ])(
    'reads a %s attack through the readable pattern rather than its backing index',
    async (_name, backingIndex, pattern) => {
      // Users hold read on the alias pattern, not on `.internal.alerts-*`. Reading the
      // snapshotted backing index would be refused and silently strand the attack's alerts.
      mockAttacks([attackHit('attack-1', ['alert-1'])]);

      const result = await onDelete({
        caseId: 'case-1',
        request,
        attachments: [attackTarget('attack-att-1', 'attack-1', backingIndex)],
        remainingAttachments: [alertTarget('alert-att-1', ['alert-1'])],
      });

      expect(result).toEqual({
        relatedAttachmentIds: ['alert-att-1'],
        relatedAttachmentUpdates: [],
      });
      expect(esClient.search).toHaveBeenCalledWith(expect.objectContaining({ index: pattern }));
    }
  );

  it('keeps the alert attachments another attached attack still claims, relabelling them onto it', async () => {
    mockAttacks([
      attackHit('attack-1', ['alert-1', 'alert-2']),
      attackHit('attack-2', ['alert-2']),
    ]);

    const result = await onDelete({
      caseId: 'case-1',
      request,
      attachments: [attackTarget('attack-att-1', 'attack-1')],
      remainingAttachments: [
        attackTarget('attack-att-2', 'attack-2'),
        alertTarget('alert-att-1', ['alert-1']),
        alertTarget('alert-att-2', ['alert-2']),
      ],
    });

    expect(result).toEqual({
      relatedAttachmentIds: ['alert-att-1'],
      relatedAttachmentUpdates: [
        {
          id: 'alert-att-2',
          payload: {
            type: SECURITY_ALERT_ATTACHMENT_TYPE,
            owner: 'securitySolution',
            attachmentId: ['alert-2'],
            metadata: { index: ALERT_INDEX, sourceAttachmentIds: ['attack-2'] },
          },
        },
      ],
    });
  });

  it('keeps an alert attachment the analyst created, even when the attack lists that alert', async () => {
    // The analyst attached `alert-1` on its own, so the attack's own attachment only ever held
    // `alert-2`. Deleting the attack over the public API skips the UI prompt, so the provenance
    // recorded at attach time is the only thing keeping the analyst's evidence on the case.
    mockAttacks([attackHit('attack-1', ['alert-1', 'alert-2'])]);

    const result = await onDelete({
      caseId: 'case-1',
      request,
      attachments: [attackTarget('attack-att-1', 'attack-1')],
      remainingAttachments: [
        alertTarget('alert-att-analyst', ['alert-1'], null),
        alertTarget('alert-att-1', ['alert-2']),
      ],
    });

    expect(result).toEqual({ relatedAttachmentIds: ['alert-att-1'], relatedAttachmentUpdates: [] });
  });

  it('keeps every alert attachment when the attacks cannot be read', async () => {
    esClient.search.mockRejectedValue(new Error('security_exception'));

    const result = await onDelete({
      caseId: 'case-1',
      request,
      attachments: [attackTarget('attack-att-1', 'attack-1')],
      remainingAttachments: [alertTarget('alert-att-1', ['alert-1'])],
    });

    expect(result).toEqual({ relatedAttachmentIds: [], relatedAttachmentUpdates: [] });
  });

  describe('an alert attachment the deleted attack shares with another attack', () => {
    it('shrinks it to the shared alerts and relabels it onto the attack still claiming them', async () => {
      // Attached after `attack-1`, `attack-2` had `alert-shared` deduped out of its own attachment.
      mockAttacks([
        attackHit('attack-1', ['alert-shared', 'alert-1']),
        attackHit('attack-2', ['alert-shared', 'alert-2']),
      ]);

      const result = await onDelete({
        caseId: 'case-1',
        request,
        attachments: [attackTarget('attack-att-1', 'attack-1')],
        remainingAttachments: [
          attackTarget('attack-att-2', 'attack-2'),
          alertTarget('alert-att-1', ['alert-shared', 'alert-1']),
          alertTarget('alert-att-2', ['alert-2'], ['attack-2']),
        ],
      });

      expect(result).toEqual({
        relatedAttachmentIds: [],
        relatedAttachmentUpdates: [
          {
            id: 'alert-att-1',
            payload: {
              type: SECURITY_ALERT_ATTACHMENT_TYPE,
              owner: 'securitySolution',
              attachmentId: ['alert-shared'],
              metadata: { index: ALERT_INDEX, sourceAttachmentIds: ['attack-2'] },
            },
          },
        ],
      });
    });

    it('keeps the index of each remaining alert, matched by position', async () => {
      mockAttacks([
        attackHit('attack-1', ['alert-1', 'alert-2', 'alert-3']),
        attackHit('attack-2', ['alert-1', 'alert-3']),
      ]);

      const result = await onDelete({
        caseId: 'case-1',
        request,
        attachments: [attackTarget('attack-att-1', 'attack-1')],
        remainingAttachments: [
          attackTarget('attack-att-2', 'attack-2'),
          alertTarget('alert-att-1', ['alert-1', 'alert-2', 'alert-3'], ['attack-1'], {
            index: ['index-1', 'index-2', 'index-3'],
          }),
        ],
      });

      expect(result.relatedAttachmentUpdates).toEqual([
        expect.objectContaining({
          payload: expect.objectContaining({
            attachmentId: ['alert-1', 'alert-3'],
            metadata: expect.objectContaining({ index: ['index-1', 'index-3'] }),
          }),
        }),
      ]);
    });

    it.each([
      ['a single index shared by every alert', ALERT_INDEX],
      ['an index list that does not line up with the alerts', ['index-a', 'index-b']],
    ])('keeps %s exactly as stored', async (_name, index) => {
      mockAttacks([
        attackHit('attack-1', ['alert-1', 'alert-2', 'alert-3']),
        attackHit('attack-2', ['alert-3']),
      ]);

      const result = await onDelete({
        caseId: 'case-1',
        request,
        attachments: [attackTarget('attack-att-1', 'attack-1')],
        remainingAttachments: [
          attackTarget('attack-att-2', 'attack-2'),
          alertTarget('alert-att-1', ['alert-1', 'alert-2', 'alert-3'], ['attack-1'], { index }),
        ],
      });

      expect(result.relatedAttachmentUpdates).toEqual([
        expect.objectContaining({
          payload: expect.objectContaining({
            attachmentId: ['alert-3'],
            metadata: expect.objectContaining({ index }),
          }),
        }),
      ]);
    });

    it('preserves the rest of the stored attachment while rewriting its alerts and provenance', async () => {
      mockAttacks([
        attackHit('attack-1', ['alert-1', 'alert-2']),
        attackHit('attack-2', ['alert-2']),
      ]);
      const rule = { id: 'rule-1', name: 'Suspicious process' };

      const result = await onDelete({
        caseId: 'case-1',
        request,
        attachments: [attackTarget('attack-att-1', 'attack-1')],
        remainingAttachments: [
          attackTarget('attack-att-2', 'attack-2'),
          // Created by both attacks in one bulk attach, so the provenance shrinks as well.
          alertTarget('alert-att-1', ['alert-1', 'alert-2'], ['attack-1', 'attack-2'], { rule }),
        ],
      });

      expect(result.relatedAttachmentUpdates).toEqual([
        {
          id: 'alert-att-1',
          payload: {
            type: SECURITY_ALERT_ATTACHMENT_TYPE,
            owner: 'securitySolution',
            attachmentId: ['alert-2'],
            metadata: { index: ALERT_INDEX, rule, sourceAttachmentIds: ['attack-2'] },
          },
        },
      ]);
    });

    it('relabels it onto no attack when what it keeps has left every attack', async () => {
      // `alert-orphan` left `attack-1` after it was attached, and no other attack lists it.
      mockAttacks([attackHit('attack-1', ['alert-1'])]);

      const result = await onDelete({
        caseId: 'case-1',
        request,
        attachments: [attackTarget('attack-att-1', 'attack-1')],
        remainingAttachments: [alertTarget('alert-att-1', ['alert-1', 'alert-orphan'])],
      });

      expect(result).toEqual({
        relatedAttachmentIds: [],
        relatedAttachmentUpdates: [
          {
            id: 'alert-att-1',
            payload: {
              type: SECURITY_ALERT_ATTACHMENT_TYPE,
              owner: 'securitySolution',
              attachmentId: ['alert-orphan'],
              metadata: { index: ALERT_INDEX, sourceAttachmentIds: [] },
            },
          },
        ],
      });
    });
  });

  it('relabels an alert attachment it may take nothing from without touching its alerts or indices', async () => {
    mockAttacks([
      attackHit('attack-1', ['alert-1', 'alert-2']),
      attackHit('attack-2', ['alert-1', 'alert-2']),
    ]);
    const rule = { id: 'rule-1', name: 'Suspicious process' };

    const result = await onDelete({
      caseId: 'case-1',
      request,
      attachments: [attackTarget('attack-att-1', 'attack-1')],
      remainingAttachments: [
        attackTarget('attack-att-2', 'attack-2'),
        alertTarget('alert-att-1', ['alert-2', 'alert-1'], ['attack-1'], {
          index: ['index-2', 'index-1'],
          rule,
        }),
      ],
    });

    expect(result).toEqual({
      relatedAttachmentIds: [],
      relatedAttachmentUpdates: [
        {
          id: 'alert-att-1',
          payload: {
            type: SECURITY_ALERT_ATTACHMENT_TYPE,
            owner: 'securitySolution',
            attachmentId: ['alert-2', 'alert-1'],
            metadata: { index: ['index-2', 'index-1'], rule, sourceAttachmentIds: ['attack-2'] },
          },
        },
      ],
    });
  });
});
