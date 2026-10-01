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

const attackTarget = (id: string, attackId: string): AttachmentDeleteTarget =>
  ({
    id,
    attributes: {
      type: SECURITY_ATTACK_ATTACHMENT_TYPE,
      attachmentId: attackId,
      owner: 'securitySolution',
      metadata: { title: attackId, alertCount: 1, index: ATTACK_INDEX },
    },
  } as unknown as AttachmentDeleteTarget);

const alertTarget = (id: string, alertIds: string[]): AttachmentDeleteTarget =>
  ({
    id,
    attributes: {
      type: SECURITY_ALERT_ATTACHMENT_TYPE,
      attachmentId: alertIds,
      owner: 'securitySolution',
      metadata: { index: '.alerts-security.alerts-default' },
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

    expect(result).toEqual({ relatedAttachmentIds: ['alert-att-1'] });
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ATTACK_INDEX,
        query: { ids: { values: ['attack-1'] } },
      })
    );
  });

  it('keeps the alert attachments another attached attack still claims', async () => {
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

    expect(result).toEqual({ relatedAttachmentIds: ['alert-att-1'] });
  });

  it('keeps every alert attachment when the attacks cannot be read', async () => {
    esClient.search.mockRejectedValue(new Error('security_exception'));

    const result = await onDelete({
      caseId: 'case-1',
      request,
      attachments: [attackTarget('attack-att-1', 'attack-1')],
      remainingAttachments: [alertTarget('alert-att-1', ['alert-1'])],
    });

    expect(result).toEqual({ relatedAttachmentIds: [] });
  });
});
