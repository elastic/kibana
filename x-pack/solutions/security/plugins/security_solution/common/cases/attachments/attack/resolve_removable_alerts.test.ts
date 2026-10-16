/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentType,
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
  STACK_ALERT_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';
import type { CaseAlertAttachment, CaseAttachmentWithId } from './resolve_removable_alerts';
import {
  getCaseAlertAttachments,
  resolveRemovableAlertAttachments,
} from './resolve_removable_alerts';

const REMOVED_ATTACK_ID = 'attack-1';

const alertAttachment = (
  id: string,
  alertIds: string[],
  sourceAttackIds: string[] = [REMOVED_ATTACK_ID]
): CaseAlertAttachment => ({ id, alertIds, sourceAttackIds });

describe('getCaseAlertAttachments', () => {
  it('extracts unified alert attachments with their ids and provenance', () => {
    const comments = [
      {
        id: 'attachment-1',
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: ['alert-1', 'alert-2'],
        metadata: { sourceAttachmentIds: ['attack-1'] },
      },
      {
        id: 'attachment-2',
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: 'alert-3',
      },
    ] as unknown as CaseAttachmentWithId[];

    expect(getCaseAlertAttachments(comments)).toEqual([
      { id: 'attachment-1', alertIds: ['alert-1', 'alert-2'], sourceAttackIds: ['attack-1'] },
      // No provenance: the analyst attached this one themselves.
      { id: 'attachment-2', alertIds: ['alert-3'], sourceAttackIds: [] },
    ]);
  });

  it('ignores alert attachments from the other alert families', () => {
    // A document id only identifies an alert alongside its index, so an observability or stack
    // alert whose id happens to match one in the attack must not be swept up with it.
    const comments = [
      {
        id: 'attachment-1',
        type: OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: 'alert-1',
      },
      {
        id: 'attachment-2',
        type: STACK_ALERT_ATTACHMENT_TYPE,
        attachmentId: 'alert-2',
      },
    ] as unknown as CaseAttachmentWithId[];

    expect(getCaseAlertAttachments(comments)).toEqual([]);
  });

  it('ignores attachments that are not unified alerts', () => {
    const comments = [
      {
        id: 'attachment-1',
        type: SECURITY_ATTACK_ATTACHMENT_TYPE,
        attachmentId: 'attack-1',
      },
      {
        // A legacy alert attachment was never brought in by an attack.
        id: 'attachment-2',
        type: AttachmentType.alert,
        alertId: 'alert-1',
        index: '.alerts-security.alerts-default',
      },
    ] as unknown as CaseAttachmentWithId[];

    expect(getCaseAlertAttachments(comments)).toEqual([]);
  });
});

describe('resolveRemovableAlertAttachments', () => {
  it('returns nothing when the attack shares no alerts with the case', () => {
    expect(
      resolveRemovableAlertAttachments({
        removedAttackIds: [REMOVED_ATTACK_ID],
        attackAlertIds: ['alert-1', 'alert-2'],
        alertAttachments: [alertAttachment('attachment-1', ['alert-9'])],
        otherAttackAlertIds: [],
      })
    ).toEqual({ attachmentIds: [], alertIds: [], isResolvable: true });
  });

  it('returns every attachment when the attack is the only claimant', () => {
    expect(
      resolveRemovableAlertAttachments({
        removedAttackIds: [REMOVED_ATTACK_ID],
        attackAlertIds: ['alert-1', 'alert-2'],
        alertAttachments: [
          alertAttachment('attachment-1', ['alert-1']),
          alertAttachment('attachment-2', ['alert-2']),
        ],
        otherAttackAlertIds: [],
      })
    ).toEqual({
      attachmentIds: ['attachment-1', 'attachment-2'],
      alertIds: ['alert-1', 'alert-2'],
      isResolvable: true,
    });
  });

  it('excludes every alert when another attached attack claims the same set', () => {
    expect(
      resolveRemovableAlertAttachments({
        removedAttackIds: [REMOVED_ATTACK_ID],
        attackAlertIds: ['alert-1', 'alert-2'],
        alertAttachments: [
          alertAttachment('attachment-1', ['alert-1']),
          alertAttachment('attachment-2', ['alert-2']),
        ],
        otherAttackAlertIds: [['alert-1', 'alert-2']],
      })
    ).toEqual({ attachmentIds: [], alertIds: [], isResolvable: true });
  });

  it('excludes only the alerts another attached attack also claims', () => {
    expect(
      resolveRemovableAlertAttachments({
        removedAttackIds: [REMOVED_ATTACK_ID],
        attackAlertIds: ['alert-1', 'alert-2', 'alert-3'],
        alertAttachments: [
          alertAttachment('attachment-1', ['alert-1']),
          alertAttachment('attachment-2', ['alert-2']),
          alertAttachment('attachment-3', ['alert-3']),
        ],
        otherAttackAlertIds: [['alert-2'], ['alert-9']],
      })
    ).toEqual({
      attachmentIds: ['attachment-1', 'attachment-3'],
      alertIds: ['alert-1', 'alert-3'],
      isResolvable: true,
    });
  });

  it('never returns an alert that left the attack since attach time', () => {
    expect(
      resolveRemovableAlertAttachments({
        removedAttackIds: [REMOVED_ATTACK_ID],
        // `alert-2` was attached with the attack but is no longer part of it.
        attackAlertIds: ['alert-1'],
        alertAttachments: [
          alertAttachment('attachment-1', ['alert-1']),
          alertAttachment('attachment-2', ['alert-2']),
        ],
        otherAttackAlertIds: [],
      })
    ).toEqual({
      attachmentIds: ['attachment-1'],
      alertIds: ['alert-1'],
      isResolvable: true,
    });
  });

  it.each([[undefined], [null]])(
    'reports an unresolvable attack (%p) rather than throwing',
    (attackAlertIds) => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          attackAlertIds,
          alertAttachments: [alertAttachment('attachment-1', ['alert-1'])],
          otherAttackAlertIds: [],
        })
      ).toEqual({ attachmentIds: [], alertIds: [], isResolvable: false });
    }
  );

  it('reports unresolvable when another attached attack cannot be resolved', () => {
    expect(
      resolveRemovableAlertAttachments({
        removedAttackIds: [REMOVED_ATTACK_ID],
        attackAlertIds: ['alert-1'],
        alertAttachments: [alertAttachment('attachment-1', ['alert-1'])],
        otherAttackAlertIds: [undefined],
      })
    ).toEqual({ attachmentIds: [], alertIds: [], isResolvable: false });
  });

  it('keeps an attachment whose alerts are only partly removable', () => {
    expect(
      resolveRemovableAlertAttachments({
        removedAttackIds: [REMOVED_ATTACK_ID],
        attackAlertIds: ['alert-1', 'alert-2'],
        // One attachment covers both alerts, but another attack claims `alert-2`, so deleting
        // the attachment would strip evidence from that attack too.
        alertAttachments: [alertAttachment('attachment-1', ['alert-1', 'alert-2'])],
        otherAttackAlertIds: [['alert-2']],
      })
    ).toEqual({ attachmentIds: [], alertIds: [], isResolvable: true });
  });

  it('dedupes alert ids reported across attachments', () => {
    expect(
      resolveRemovableAlertAttachments({
        removedAttackIds: [REMOVED_ATTACK_ID],
        attackAlertIds: ['alert-1'],
        alertAttachments: [
          alertAttachment('attachment-1', ['alert-1']),
          alertAttachment('attachment-2', ['alert-1']),
        ],
        otherAttackAlertIds: [],
      })
    ).toEqual({
      attachmentIds: ['attachment-1', 'attachment-2'],
      alertIds: ['alert-1'],
      isResolvable: true,
    });
  });

  it('ignores an alert attachment with no alert ids', () => {
    expect(
      resolveRemovableAlertAttachments({
        removedAttackIds: [REMOVED_ATTACK_ID],
        attackAlertIds: ['alert-1'],
        alertAttachments: [alertAttachment('attachment-1', [])],
        otherAttackAlertIds: [],
      })
    ).toEqual({ attachmentIds: [], alertIds: [], isResolvable: true });
  });

  it('returns nothing when the case has no alert attachments', () => {
    expect(
      resolveRemovableAlertAttachments({
        removedAttackIds: [REMOVED_ATTACK_ID],
        attackAlertIds: ['alert-1'],
        alertAttachments: [],
        otherAttackAlertIds: [],
      })
    ).toEqual({ attachmentIds: [], alertIds: [], isResolvable: true });
  });

  describe('provenance', () => {
    it('never returns an alert the analyst attached themselves', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          attackAlertIds: ['alert-1', 'alert-2'],
          alertAttachments: [
            // Attached on its own before the attack, so the attack's own attachment holds only
            // `alert-2`. The attack lists `alert-1` too, but it did not put it on the case.
            alertAttachment('attachment-1', ['alert-1'], []),
            alertAttachment('attachment-2', ['alert-2']),
          ],
          otherAttackAlertIds: [],
        })
      ).toEqual({
        attachmentIds: ['attachment-2'],
        alertIds: ['alert-2'],
        isResolvable: true,
      });
    });

    it('never returns an alert another attack put on the case', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          attackAlertIds: ['alert-1'],
          alertAttachments: [alertAttachment('attachment-1', ['alert-1'], ['attack-2'])],
          otherAttackAlertIds: [],
        })
      ).toEqual({ attachmentIds: [], alertIds: [], isResolvable: true });
    });

    it('returns an attachment any of the removed attacks created', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID, 'attack-2'],
          attackAlertIds: ['alert-1'],
          alertAttachments: [alertAttachment('attachment-1', ['alert-1'], ['attack-2'])],
          otherAttackAlertIds: [],
        })
      ).toEqual({
        attachmentIds: ['attachment-1'],
        alertIds: ['alert-1'],
        isResolvable: true,
      });
    });
  });
});
