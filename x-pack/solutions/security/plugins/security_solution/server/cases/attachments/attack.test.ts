/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
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
import { getAttackRelatedAttachments } from './attack';

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

describe('getAttackRelatedAttachments', () => {
  const request = httpServerMock.createKibanaRequest();
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let getRelated: ReturnType<typeof getAttackRelatedAttachments>;

  const mockAttacks = (hits: Array<ReturnType<typeof attackHit>>) =>
    esClient.search.mockResolvedValue({
      hits: { hits },
    } as unknown as Awaited<ReturnType<typeof esClient.search>>);

  const alerts = (attachmentIds: string[]) => [
    { type: SECURITY_ALERT_ATTACHMENT_TYPE, attachmentIds },
  ];

  beforeEach(() => {
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const scopedClient = elasticsearchServiceMock.createScopedClusterClient();
    esClient = scopedClient.asCurrentUser;
    jest.mocked(coreStart.elasticsearch.client.asScoped).mockReturnValue(scopedClient);
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    getRelated = getAttackRelatedAttachments({
      getStartServices: coreSetup.getStartServices,
      logger: loggerMock.create(),
    });
  });

  it('does not read the attacks when no alert an attack attached remains on the case', async () => {
    const result = await getRelated({
      caseId: 'case-1',
      request,
      attachments: [attackTarget('attack-att-1', 'attack-1')],
      remainingAttachments: [alertTarget('alert-att-analyst', ['alert-1'], null)],
    });

    expect(result).toEqual([]);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('returns the alerts of the deleted attack, de-anonymising its alert ids', async () => {
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

    const result = await getRelated({
      caseId: 'case-1',
      request,
      attachments: [attackTarget('attack-att-1', 'attack-1')],
      remainingAttachments: [
        alertTarget('alert-att-1', ['alert-1', 'alert-2']),
        // `alert-3` has since left the attack, so it stays.
        alertTarget('alert-att-2', ['alert-3']),
      ],
    });

    expect(result).toEqual(alerts(['alert-1', 'alert-2']));
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

      const result = await getRelated({
        caseId: 'case-1',
        request,
        attachments: [attackTarget('attack-att-1', 'attack-1', backingIndex)],
        remainingAttachments: [alertTarget('alert-att-1', ['alert-1'])],
      });

      expect(result).toEqual(alerts(['alert-1']));
      expect(esClient.search).toHaveBeenCalledWith(expect.objectContaining({ index: pattern }));
    }
  );

  it('keeps the alerts another attached attack still lists', async () => {
    mockAttacks([
      attackHit('attack-1', ['alert-1', 'alert-2']),
      attackHit('attack-2', ['alert-2']),
    ]);

    const result = await getRelated({
      caseId: 'case-1',
      request,
      attachments: [attackTarget('attack-att-1', 'attack-1')],
      remainingAttachments: [
        attackTarget('attack-att-2', 'attack-2'),
        alertTarget('alert-att-1', ['alert-1', 'alert-2']),
      ],
    });

    expect(result).toEqual(alerts(['alert-1']));
  });

  it('takes a shared alert once the last attack listing it goes, whichever attack attached it', async () => {
    // `attack-1` attached the shared alert first, so `attack-2`'s attachment never held it.
    mockAttacks([attackHit('attack-2', ['alert-shared', 'alert-2'])]);

    const result = await getRelated({
      caseId: 'case-1',
      request,
      attachments: [attackTarget('attack-att-2', 'attack-2')],
      remainingAttachments: [
        alertTarget('alert-att-1', ['alert-shared'], ['attack-1']),
        alertTarget('alert-att-2', ['alert-2'], ['attack-2']),
      ],
    });

    expect(result).toEqual(alerts(['alert-shared', 'alert-2']));
  });

  it('keeps an alert the analyst attached, even when the attack lists that alert', async () => {
    // The analyst attached `alert-1` on its own, so the attack's own attachment only ever held
    // `alert-2`. The provenance recorded at attach time is the only thing keeping the analyst's
    // evidence on the case.
    mockAttacks([attackHit('attack-1', ['alert-1', 'alert-2'])]);

    const result = await getRelated({
      caseId: 'case-1',
      request,
      attachments: [attackTarget('attack-att-1', 'attack-1')],
      remainingAttachments: [
        alertTarget('alert-att-analyst', ['alert-1'], null),
        alertTarget('alert-att-1', ['alert-2']),
      ],
    });

    expect(result).toEqual(alerts(['alert-2']));
  });

  it('keeps every alert when the attacks cannot be read', async () => {
    esClient.search.mockRejectedValue(
      new errors.ResponseError({
        statusCode: 403,
        body: { error: { type: 'security_exception' } },
        headers: {},
        meta: {},
        warnings: null,
      } as unknown as ConstructorParameters<typeof errors.ResponseError>[0])
    );

    const result = await getRelated({
      caseId: 'case-1',
      request,
      attachments: [attackTarget('attack-att-1', 'attack-1')],
      remainingAttachments: [alertTarget('alert-att-1', ['alert-1'])],
    });

    expect(result).toEqual([]);
  });

  it('fails the deletion when the attacks cannot be read for any other reason', async () => {
    esClient.search.mockRejectedValue(Object.assign(new Error('timeout'), { statusCode: 504 }));

    await expect(
      getRelated({
        caseId: 'case-1',
        request,
        attachments: [attackTarget('attack-att-1', 'attack-1')],
        remainingAttachments: [alertTarget('alert-att-1', ['alert-1'])],
      })
    ).rejects.toThrow('timeout');
  });

  it('keeps every alert when another attack on the case has no stored alert ids', async () => {
    mockAttacks([
      attackHit('attack-1', ['alert-1']),
      { _id: 'attack-2', _index: ATTACK_INDEX, _source: {} } as ReturnType<typeof attackHit>,
    ]);

    const result = await getRelated({
      caseId: 'case-1',
      request,
      attachments: [attackTarget('attack-att-1', 'attack-1')],
      remainingAttachments: [
        attackTarget('attack-att-2', 'attack-2'),
        alertTarget('alert-att-1', ['alert-1']),
      ],
    });

    expect(result).toEqual([]);
  });

  it('takes the alerts of every deleted attack at once', async () => {
    mockAttacks([attackHit('attack-1', ['alert-1']), attackHit('attack-2', ['alert-2'])]);

    const result = await getRelated({
      caseId: 'case-1',
      request,
      attachments: [
        attackTarget('attack-att-1', 'attack-1'),
        attackTarget('attack-att-2', 'attack-2'),
      ],
      remainingAttachments: [
        alertTarget('alert-att-1', ['alert-1'], ['attack-1']),
        alertTarget('alert-att-2', ['alert-2'], ['attack-2']),
      ],
    });

    expect(result).toEqual(alerts(['alert-1', 'alert-2']));
  });
});
