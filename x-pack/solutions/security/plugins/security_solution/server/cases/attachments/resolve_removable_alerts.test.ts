/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common/constants';
import type { CaseAlertAttachment, CaseAttachmentWithId } from './resolve_removable_alerts';
import { getCaseAlertAttachments, resolveRemovableAlertIds } from './resolve_removable_alerts';

const alertAttachment = (
  id: string,
  attachmentId: string | string[],
  sourceAttachmentIds?: string[]
): CaseAttachmentWithId =>
  ({
    id,
    type: SECURITY_ALERT_ATTACHMENT_TYPE,
    owner: 'securitySolution',
    attachmentId,
    metadata: {
      index: '.alerts-security.alerts-default',
      ...(sourceAttachmentIds != null ? { sourceAttachmentIds } : {}),
    },
  } as unknown as CaseAttachmentWithId);

describe('getCaseAlertAttachments', () => {
  it('reads the alert ids and whether an attack attached them', () => {
    expect(
      getCaseAlertAttachments([
        alertAttachment('from-attack', ['alert-1', 'alert-2'], ['attack-1']),
        alertAttachment('from-analyst', 'alert-3'),
        alertAttachment('stale-source', ['alert-4'], []),
      ])
    ).toEqual([
      { id: 'from-attack', alertIds: ['alert-1', 'alert-2'], isFromAttack: true },
      { id: 'from-analyst', alertIds: ['alert-3'], isFromAttack: false },
      { id: 'stale-source', alertIds: ['alert-4'], isFromAttack: true },
    ]);
  });

  it('ignores attachments that are not security alerts', () => {
    expect(
      getCaseAlertAttachments([
        {
          id: 'attack',
          type: SECURITY_ATTACK_ATTACHMENT_TYPE,
          owner: 'securitySolution',
          attachmentId: 'attack-1',
          metadata: { index: 'attacks' },
        } as unknown as CaseAttachmentWithId,
        {
          id: 'stack-alert',
          type: '.alert',
          owner: 'cases',
          attachmentId: 'alert-1',
          metadata: { index: 'stack', sourceAttachmentIds: ['attack-1'] },
        } as unknown as CaseAttachmentWithId,
      ])
    ).toEqual([]);
  });
});

describe('resolveRemovableAlertIds', () => {
  const fromAttack = (id: string, alertIds: string[]): CaseAlertAttachment => ({
    id,
    alertIds,
    isFromAttack: true,
  });
  const fromAnalyst = (id: string, alertIds: string[]): CaseAlertAttachment => ({
    id,
    alertIds,
    isFromAttack: false,
  });

  it("returns the removed attack's alerts that an attack attached", () => {
    expect(
      resolveRemovableAlertIds({
        removedAttackIds: ['attack-1'],
        otherAttackIds: [],
        alertIdsByAttackId: new Map([['attack-1', ['alert-1', 'alert-2']]]),
        alertAttachments: [fromAttack('att-1', ['alert-1', 'alert-2'])],
      })
    ).toEqual(['alert-1', 'alert-2']);
  });

  it('keeps an alert another attack on the case lists', () => {
    expect(
      resolveRemovableAlertIds({
        removedAttackIds: ['attack-1'],
        otherAttackIds: ['attack-2'],
        alertIdsByAttackId: new Map([
          ['attack-1', ['alert-1', 'alert-shared']],
          ['attack-2', ['alert-shared', 'alert-2']],
        ]),
        alertAttachments: [fromAttack('att-1', ['alert-1', 'alert-shared'])],
      })
    ).toEqual(['alert-1']);
  });

  it('takes an alert that a different attack attached once no attack left lists it', () => {
    expect(
      resolveRemovableAlertIds({
        removedAttackIds: ['attack-2'],
        otherAttackIds: [],
        alertIdsByAttackId: new Map([['attack-2', ['alert-shared', 'alert-2']]]),
        alertAttachments: [
          fromAttack('att-1', ['alert-shared', 'alert-1']),
          fromAttack('att-2', ['alert-2']),
        ],
      })
    ).toEqual(['alert-shared', 'alert-2']);
  });

  it('keeps an alert the analyst attached', () => {
    expect(
      resolveRemovableAlertIds({
        removedAttackIds: ['attack-1'],
        otherAttackIds: [],
        alertIdsByAttackId: new Map([['attack-1', ['alert-1', 'alert-2']]]),
        alertAttachments: [fromAnalyst('analyst', ['alert-1']), fromAttack('att-1', ['alert-2'])],
      })
    ).toEqual(['alert-2']);
  });

  it('keeps an alert in both an attack attachment and an analyst attachment', () => {
    expect(
      resolveRemovableAlertIds({
        removedAttackIds: ['attack-1'],
        otherAttackIds: [],
        alertIdsByAttackId: new Map([['attack-1', ['alert-1']]]),
        alertAttachments: [fromAnalyst('analyst', ['alert-1']), fromAttack('att-1', ['alert-1'])],
      })
    ).toEqual([]);
  });

  it('skips an alert of the attack that is not on the case', () => {
    expect(
      resolveRemovableAlertIds({
        removedAttackIds: ['attack-1'],
        otherAttackIds: [],
        alertIdsByAttackId: new Map([['attack-1', ['alert-1', 'alert-not-attached']]]),
        alertAttachments: [fromAttack('att-1', ['alert-1'])],
      })
    ).toEqual(['alert-1']);
  });

  it('keeps an alert that left the attack since it was attached', () => {
    expect(
      resolveRemovableAlertIds({
        removedAttackIds: ['attack-1'],
        otherAttackIds: [],
        alertIdsByAttackId: new Map([['attack-1', ['alert-1']]]),
        alertAttachments: [fromAttack('att-1', ['alert-1', 'alert-left'])],
      })
    ).toEqual(['alert-1']);
  });

  it('returns nothing when an attack staying on the case could not be read', () => {
    expect(
      resolveRemovableAlertIds({
        removedAttackIds: ['attack-1'],
        otherAttackIds: ['attack-unread'],
        alertIdsByAttackId: new Map([['attack-1', ['alert-1']]]),
        alertAttachments: [fromAttack('att-1', ['alert-1'])],
      })
    ).toEqual([]);
  });

  it('takes no alerts for a removed attack that could not be read', () => {
    expect(
      resolveRemovableAlertIds({
        removedAttackIds: ['attack-unread', 'attack-1'],
        otherAttackIds: [],
        alertIdsByAttackId: new Map([['attack-1', ['alert-1']]]),
        alertAttachments: [fromAttack('att-1', ['alert-1', 'alert-2'])],
      })
    ).toEqual(['alert-1']);
  });
});
