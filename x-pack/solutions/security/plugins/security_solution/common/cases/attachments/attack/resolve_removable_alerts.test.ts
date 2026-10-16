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
  resolveRemovableAlertAttachmentsForAttacks,
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
        alertAttachments: [alertAttachment('attachment-1', ['alert-9'], ['attack-2'])],
        otherAttacks: [{ id: 'attack-2', alertIds: ['alert-9'] }],
      })
    ).toEqual({ attachmentIds: [], updates: [], alertIds: [], isResolvable: true });
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
        otherAttacks: [],
      })
    ).toEqual({
      attachmentIds: ['attachment-1', 'attachment-2'],
      updates: [],
      alertIds: ['alert-1', 'alert-2'],
      isResolvable: true,
    });
  });

  it('excludes every alert when another attached attack claims the same set, relabelling them onto it', () => {
    expect(
      resolveRemovableAlertAttachments({
        removedAttackIds: [REMOVED_ATTACK_ID],
        attackAlertIds: ['alert-1', 'alert-2'],
        alertAttachments: [
          alertAttachment('attachment-1', ['alert-1']),
          alertAttachment('attachment-2', ['alert-2']),
        ],
        otherAttacks: [{ id: 'attack-2', alertIds: ['alert-1', 'alert-2'] }],
      })
    ).toEqual({
      attachmentIds: [],
      updates: [
        {
          id: 'attachment-1',
          keptAlertIds: ['alert-1'],
          removedAlertIds: [],
          sourceAttackIds: ['attack-2'],
        },
        {
          id: 'attachment-2',
          keptAlertIds: ['alert-2'],
          removedAlertIds: [],
          sourceAttackIds: ['attack-2'],
        },
      ],
      alertIds: [],
      isResolvable: true,
    });
  });

  it('excludes only the alerts another attached attack also claims, relabelling them onto it', () => {
    expect(
      resolveRemovableAlertAttachments({
        removedAttackIds: [REMOVED_ATTACK_ID],
        attackAlertIds: ['alert-1', 'alert-2', 'alert-3'],
        alertAttachments: [
          alertAttachment('attachment-1', ['alert-1']),
          alertAttachment('attachment-2', ['alert-2']),
          alertAttachment('attachment-3', ['alert-3']),
        ],
        otherAttacks: [
          { id: 'attack-2', alertIds: ['alert-2'] },
          { id: 'attack-3', alertIds: ['alert-9'] },
        ],
      })
    ).toEqual({
      attachmentIds: ['attachment-1', 'attachment-3'],
      updates: [
        {
          id: 'attachment-2',
          keptAlertIds: ['alert-2'],
          removedAlertIds: [],
          sourceAttackIds: ['attack-2'],
        },
      ],
      alertIds: ['alert-1', 'alert-3'],
      isResolvable: true,
    });
  });

  it('never returns an alert that left the attack since attach time, relabelling it onto no attack', () => {
    expect(
      resolveRemovableAlertAttachments({
        removedAttackIds: [REMOVED_ATTACK_ID],
        // `alert-2` was attached with the attack but is no longer part of it.
        attackAlertIds: ['alert-1'],
        alertAttachments: [
          alertAttachment('attachment-1', ['alert-1']),
          alertAttachment('attachment-2', ['alert-2']),
        ],
        otherAttacks: [],
      })
    ).toEqual({
      attachmentIds: ['attachment-1'],
      updates: [
        {
          id: 'attachment-2',
          keptAlertIds: ['alert-2'],
          removedAlertIds: [],
          sourceAttackIds: [],
        },
      ],
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
          otherAttacks: [],
        })
      ).toEqual({ attachmentIds: [], updates: [], alertIds: [], isResolvable: false });
    }
  );

  it.each([[undefined], [null]])(
    'reports unresolvable when another attached attack cannot be resolved (%p)',
    (alertIds) => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          attackAlertIds: ['alert-1', 'alert-2'],
          // Would otherwise be shrunk, so an unresolved claimant must block the update as well.
          alertAttachments: [alertAttachment('attachment-1', ['alert-1', 'alert-2'])],
          otherAttacks: [
            { id: 'attack-2', alertIds: ['alert-2'] },
            { id: 'attack-3', alertIds },
          ],
        })
      ).toEqual({ attachmentIds: [], updates: [], alertIds: [], isResolvable: false });
    }
  );

  it('dedupes alert ids reported across attachments', () => {
    expect(
      resolveRemovableAlertAttachments({
        removedAttackIds: [REMOVED_ATTACK_ID],
        attackAlertIds: ['alert-1'],
        alertAttachments: [
          alertAttachment('attachment-1', ['alert-1']),
          alertAttachment('attachment-2', ['alert-1']),
        ],
        otherAttacks: [],
      })
    ).toEqual({
      attachmentIds: ['attachment-1', 'attachment-2'],
      updates: [],
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
        otherAttacks: [],
      })
    ).toEqual({ attachmentIds: [], updates: [], alertIds: [], isResolvable: true });
  });

  it('returns nothing when the case has no alert attachments', () => {
    expect(
      resolveRemovableAlertAttachments({
        removedAttackIds: [REMOVED_ATTACK_ID],
        attackAlertIds: ['alert-1'],
        alertAttachments: [],
        otherAttacks: [],
      })
    ).toEqual({ attachmentIds: [], updates: [], alertIds: [], isResolvable: true });
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
          otherAttacks: [],
        })
      ).toEqual({
        attachmentIds: ['attachment-2'],
        updates: [],
        alertIds: ['alert-2'],
        isResolvable: true,
      });
    });

    it('never shrinks an attachment the analyst made, even when the attack lists part of it', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          attackAlertIds: ['alert-1'],
          alertAttachments: [alertAttachment('attachment-1', ['alert-1', 'alert-2'], [])],
          otherAttacks: [],
        })
      ).toEqual({ attachmentIds: [], updates: [], alertIds: [], isResolvable: true });
    });

    it('never returns an alert another attack put on the case', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          attackAlertIds: ['alert-1'],
          alertAttachments: [alertAttachment('attachment-1', ['alert-1'], ['attack-2'])],
          otherAttacks: [],
        })
      ).toEqual({ attachmentIds: [], updates: [], alertIds: [], isResolvable: true });
    });

    it('returns an attachment any of the removed attacks created', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID, 'attack-2'],
          attackAlertIds: ['alert-1'],
          alertAttachments: [alertAttachment('attachment-1', ['alert-1'], ['attack-2'])],
          otherAttacks: [],
        })
      ).toEqual({
        attachmentIds: ['attachment-1'],
        updates: [],
        alertIds: ['alert-1'],
        isResolvable: true,
      });
    });
  });

  describe('attacks sharing an alert, removed in either order', () => {
    // Attack A is attached first and its attachment holds the shared alert. Attack B is
    // attached second, and the Cases dedupe leaves its attachment holding only its own alert.
    const attachedAfterDedupe = [
      alertAttachment('attachment-a', ['alert-shared', 'alert-a1'], ['attack-a']),
      alertAttachment('attachment-b', ['alert-b1'], ['attack-b']),
    ];

    it('shrinks the attachment of the first attack and relabels the shared alert onto the second', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: ['attack-a'],
          attackAlertIds: ['alert-shared', 'alert-a1'],
          alertAttachments: attachedAfterDedupe,
          otherAttacks: [{ id: 'attack-b', alertIds: ['alert-shared', 'alert-b1'] }],
        })
      ).toEqual({
        attachmentIds: [],
        updates: [
          {
            id: 'attachment-a',
            keptAlertIds: ['alert-shared'],
            removedAlertIds: ['alert-a1'],
            sourceAttackIds: ['attack-b'],
          },
        ],
        alertIds: ['alert-a1'],
        isResolvable: true,
      });
    });

    it('takes the shared alert with the second attack once the first has gone', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: ['attack-b'],
          attackAlertIds: ['alert-shared', 'alert-b1'],
          alertAttachments: [
            alertAttachment('attachment-a', ['alert-shared'], ['attack-b']),
            alertAttachment('attachment-b', ['alert-b1'], ['attack-b']),
          ],
          otherAttacks: [],
        })
      ).toEqual({
        attachmentIds: ['attachment-a', 'attachment-b'],
        updates: [],
        alertIds: ['alert-shared', 'alert-b1'],
        isResolvable: true,
      });
    });

    it('takes only what the second attack introduced when it is removed first', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: ['attack-b'],
          attackAlertIds: ['alert-shared', 'alert-b1'],
          alertAttachments: attachedAfterDedupe,
          otherAttacks: [{ id: 'attack-a', alertIds: ['alert-shared', 'alert-a1'] }],
        })
      ).toEqual({
        attachmentIds: ['attachment-b'],
        updates: [],
        alertIds: ['alert-b1'],
        isResolvable: true,
      });
    });
  });

  describe('an attachment the removed attack created but may take nothing from', () => {
    it('is relabelled onto the attack still claiming it, so that attack can take it later', () => {
      const removedFirst = resolveRemovableAlertAttachments({
        removedAttackIds: ['attack-a'],
        attackAlertIds: ['alert-shared'],
        alertAttachments: [
          alertAttachment('attachment-a', ['alert-shared'], ['attack-a']),
          alertAttachment('attachment-b', ['alert-b1'], ['attack-b']),
        ],
        otherAttacks: [{ id: 'attack-b', alertIds: ['alert-shared', 'alert-b1'] }],
      });

      expect(removedFirst).toEqual({
        attachmentIds: [],
        updates: [
          {
            id: 'attachment-a',
            keptAlertIds: ['alert-shared'],
            removedAlertIds: [],
            sourceAttackIds: ['attack-b'],
          },
        ],
        alertIds: [],
        isResolvable: true,
      });

      const [relabelled] = removedFirst.updates;

      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: ['attack-b'],
          attackAlertIds: ['alert-shared', 'alert-b1'],
          alertAttachments: [
            alertAttachment(relabelled.id, relabelled.keptAlertIds, relabelled.sourceAttackIds),
            alertAttachment('attachment-b', ['alert-b1'], ['attack-b']),
          ],
          otherAttacks: [],
        })
      ).toEqual({
        attachmentIds: ['attachment-a', 'attachment-b'],
        updates: [],
        alertIds: ['alert-shared', 'alert-b1'],
        isResolvable: true,
      });
    });

    it('is relabelled onto no attack when its alerts left the removed attack and nothing else claims them', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: ['attack-a'],
          // `alert-orphan` was attached with the attack but is no longer part of it.
          attackAlertIds: ['alert-a1'],
          alertAttachments: [alertAttachment('attachment-a', ['alert-orphan'], ['attack-a'])],
          otherAttacks: [{ id: 'attack-b', alertIds: ['alert-b1'] }],
        })
      ).toEqual({
        attachmentIds: [],
        updates: [
          {
            id: 'attachment-a',
            keptAlertIds: ['alert-orphan'],
            removedAlertIds: [],
            sourceAttackIds: [],
          },
        ],
        alertIds: [],
        isResolvable: true,
      });
    });

    it('is relabelled with its alerts in their original order', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          attackAlertIds: ['alert-1', 'alert-2'],
          alertAttachments: [alertAttachment('attachment-1', ['alert-2', 'alert-1'])],
          otherAttacks: [
            { id: 'attack-2', alertIds: ['alert-1'] },
            { id: 'attack-3', alertIds: ['alert-2'] },
          ],
        })
      ).toEqual({
        attachmentIds: [],
        updates: [
          {
            id: 'attachment-1',
            keptAlertIds: ['alert-2', 'alert-1'],
            removedAlertIds: [],
            sourceAttackIds: ['attack-2', 'attack-3'],
          },
        ],
        alertIds: [],
        isResolvable: true,
      });
    });
  });

  describe('an attachment whose alerts are only partly removable', () => {
    it('is shrunk to the alerts another attack still claims', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          attackAlertIds: ['alert-1', 'alert-2'],
          // Deleting the attachment whole would strip `alert-2` from the other attack, and
          // keeping it whole would strand `alert-1` on the case.
          alertAttachments: [alertAttachment('attachment-1', ['alert-1', 'alert-2'])],
          otherAttacks: [{ id: 'attack-2', alertIds: ['alert-2'] }],
        })
      ).toEqual({
        attachmentIds: [],
        updates: [
          {
            id: 'attachment-1',
            keptAlertIds: ['alert-2'],
            removedAlertIds: ['alert-1'],
            sourceAttackIds: ['attack-2'],
          },
        ],
        alertIds: ['alert-1'],
        isResolvable: true,
      });
    });

    it('keeps its remaining alerts in their original order', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          attackAlertIds: ['alert-1', 'alert-2', 'alert-3', 'alert-4', 'alert-5'],
          alertAttachments: [
            alertAttachment('attachment-1', [
              'alert-5',
              'alert-1',
              'alert-4',
              'alert-2',
              'alert-3',
            ]),
          ],
          otherAttacks: [{ id: 'attack-2', alertIds: ['alert-3', 'alert-4', 'alert-5'] }],
        })
      ).toEqual({
        attachmentIds: [],
        updates: [
          {
            id: 'attachment-1',
            keptAlertIds: ['alert-5', 'alert-4', 'alert-3'],
            removedAlertIds: ['alert-1', 'alert-2'],
            sourceAttackIds: ['attack-2'],
          },
        ],
        alertIds: ['alert-1', 'alert-2'],
        isResolvable: true,
      });
    });

    it('keeps an alert that left the attack since attach time while dropping the rest', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          // `alert-orphan` was attached with the attack but is no longer part of it.
          attackAlertIds: ['alert-1'],
          alertAttachments: [alertAttachment('attachment-1', ['alert-orphan', 'alert-1'])],
          otherAttacks: [],
        })
      ).toEqual({
        attachmentIds: [],
        updates: [
          {
            id: 'attachment-1',
            keptAlertIds: ['alert-orphan'],
            removedAlertIds: ['alert-1'],
            sourceAttackIds: [],
          },
        ],
        alertIds: ['alert-1'],
        isResolvable: true,
      });
    });

    it('is relabelled to no attack when none still on the case claims what it kept', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          attackAlertIds: ['alert-1'],
          alertAttachments: [alertAttachment('attachment-1', ['alert-1', 'alert-orphan'])],
          otherAttacks: [{ id: 'attack-2', alertIds: ['alert-9'] }],
        })
      ).toEqual({
        attachmentIds: [],
        updates: [
          {
            id: 'attachment-1',
            keptAlertIds: ['alert-orphan'],
            removedAlertIds: ['alert-1'],
            sourceAttackIds: [],
          },
        ],
        alertIds: ['alert-1'],
        isResolvable: true,
      });
    });

    it('is relabelled to every attack still on the case claiming any of what it kept', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          attackAlertIds: ['alert-1', 'alert-2', 'alert-3'],
          alertAttachments: [alertAttachment('attachment-1', ['alert-1', 'alert-2', 'alert-3'])],
          otherAttacks: [
            { id: 'attack-2', alertIds: ['alert-2'] },
            { id: 'attack-3', alertIds: ['alert-9'] },
            { id: 'attack-4', alertIds: ['alert-3', 'alert-9'] },
          ],
        })
      ).toEqual({
        attachmentIds: [],
        updates: [
          {
            id: 'attachment-1',
            keptAlertIds: ['alert-2', 'alert-3'],
            removedAlertIds: ['alert-1'],
            sourceAttackIds: ['attack-2', 'attack-4'],
          },
        ],
        alertIds: ['alert-1'],
        isResolvable: true,
      });
    });

    it('is deleted whole once the removed attacks together cover every alert it holds', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID, 'attack-2'],
          attackAlertIds: ['alert-1', 'alert-2'],
          alertAttachments: [alertAttachment('attachment-1', ['alert-1', 'alert-2'])],
          otherAttacks: [{ id: 'attack-3', alertIds: ['alert-9'] }],
        })
      ).toEqual({
        attachmentIds: ['attachment-1'],
        updates: [],
        alertIds: ['alert-1', 'alert-2'],
        isResolvable: true,
      });
    });

    it('is shrunk alongside attachments deleted whole, relabelled or left alone in the same removal', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          attackAlertIds: ['alert-1', 'alert-2', 'alert-3'],
          alertAttachments: [
            alertAttachment('attachment-whole', ['alert-1']),
            alertAttachment('attachment-partial', ['alert-1', 'alert-2', 'alert-3']),
            alertAttachment('attachment-claimed', ['alert-3']),
            alertAttachment('attachment-other', ['alert-3'], ['attack-2']),
          ],
          otherAttacks: [{ id: 'attack-2', alertIds: ['alert-3'] }],
        })
      ).toEqual({
        attachmentIds: ['attachment-whole'],
        updates: [
          {
            id: 'attachment-partial',
            keptAlertIds: ['alert-3'],
            removedAlertIds: ['alert-1', 'alert-2'],
            sourceAttackIds: ['attack-2'],
          },
          {
            id: 'attachment-claimed',
            keptAlertIds: ['alert-3'],
            removedAlertIds: [],
            sourceAttackIds: ['attack-2'],
          },
        ],
        // `alert-1` leaves through both attachments and is counted once.
        alertIds: ['alert-1', 'alert-2'],
        isResolvable: true,
      });
    });
  });

  describe('when removal is declined', () => {
    // The alerts stay, but the attack that vouched for them is leaving: an attachment left
    // naming it would match no attack still on the case, so nothing would ever reconsider it.
    it('removes nothing and relabels every attachment the attack created', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          attackAlertIds: ['alert-1', 'alert-2'],
          alertAttachments: [
            alertAttachment('attachment-1', ['alert-1', 'alert-2']),
            alertAttachment('attachment-2', ['alert-3'], ['attack-2']),
          ],
          otherAttacks: [{ id: 'attack-2', alertIds: ['alert-2', 'alert-3'] }],
          allowRemoval: false,
        })
      ).toEqual({
        attachmentIds: [],
        updates: [
          {
            id: 'attachment-1',
            keptAlertIds: ['alert-1', 'alert-2'],
            removedAlertIds: [],
            sourceAttackIds: ['attack-2'],
          },
        ],
        alertIds: [],
        isResolvable: true,
      });
    });

    // Otherwise identical to an attachment the analyst made themselves, which is what keeping
    // the alerts amounts to.
    it('relabels onto no attack when nothing else claims the alerts', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          attackAlertIds: ['alert-1'],
          alertAttachments: [alertAttachment('attachment-1', ['alert-1'])],
          otherAttacks: [],
          allowRemoval: false,
        })
      ).toEqual({
        attachmentIds: [],
        updates: [
          {
            id: 'attachment-1',
            keptAlertIds: ['alert-1'],
            removedAlertIds: [],
            sourceAttackIds: [],
          },
        ],
        alertIds: [],
        isResolvable: true,
      });
    });

    it('still touches nothing the removed attack did not create', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          attackAlertIds: ['alert-1'],
          alertAttachments: [alertAttachment('attachment-1', ['alert-1'], [])],
          otherAttacks: [],
          allowRemoval: false,
        })
      ).toEqual({ attachmentIds: [], updates: [], alertIds: [], isResolvable: true });
    });

    it('is still unresolvable when an alert set is missing', () => {
      expect(
        resolveRemovableAlertAttachments({
          removedAttackIds: [REMOVED_ATTACK_ID],
          attackAlertIds: undefined,
          alertAttachments: [alertAttachment('attachment-1', ['alert-1'])],
          otherAttacks: [],
          allowRemoval: false,
        })
      ).toEqual({ attachmentIds: [], updates: [], alertIds: [], isResolvable: false });
    });
  });
});

describe('resolveRemovableAlertAttachmentsForAttacks', () => {
  it('shrinks an attachment by the union of every removed attack', () => {
    expect(
      resolveRemovableAlertAttachmentsForAttacks({
        removedAttackIds: ['attack-1', 'attack-2'],
        otherAttackIds: ['attack-3'],
        alertIdsByAttackId: new Map([
          ['attack-1', ['alert-1']],
          ['attack-2', ['alert-2']],
          ['attack-3', ['alert-3']],
        ]),
        // Created by `attack-1` alone, yet `alert-2` goes with it because `attack-2` leaves too.
        alertAttachments: [alertAttachment('attachment-1', ['alert-1', 'alert-2', 'alert-3'])],
      })
    ).toEqual({
      attachmentIds: [],
      updates: [
        {
          id: 'attachment-1',
          keptAlertIds: ['alert-3'],
          removedAlertIds: ['alert-1', 'alert-2'],
          sourceAttackIds: ['attack-3'],
        },
      ],
      alertIds: ['alert-1', 'alert-2'],
      isResolvable: true,
    });
  });

  it('keeps an alert shared within the selection removable rather than claimed', () => {
    expect(
      resolveRemovableAlertAttachmentsForAttacks({
        removedAttackIds: ['attack-1', 'attack-2'],
        otherAttackIds: [],
        alertIdsByAttackId: new Map([
          ['attack-1', ['alert-1', 'alert-2']],
          ['attack-2', ['alert-2']],
        ]),
        alertAttachments: [alertAttachment('attachment-1', ['alert-1', 'alert-2'])],
      })
    ).toEqual({
      attachmentIds: ['attachment-1'],
      updates: [],
      alertIds: ['alert-1', 'alert-2'],
      isResolvable: true,
    });
  });

  it('is not resolvable when any removed attack is missing its alert ids', () => {
    expect(
      resolveRemovableAlertAttachmentsForAttacks({
        removedAttackIds: ['attack-1', 'attack-2'],
        otherAttackIds: [],
        alertIdsByAttackId: new Map([['attack-1', ['alert-1']]]),
        alertAttachments: [alertAttachment('attachment-1', ['alert-1', 'alert-2'])],
      })
    ).toEqual({ attachmentIds: [], updates: [], alertIds: [], isResolvable: false });
  });

  it('is not resolvable when any other attack is missing its alert ids', () => {
    expect(
      resolveRemovableAlertAttachmentsForAttacks({
        removedAttackIds: ['attack-1'],
        otherAttackIds: ['attack-2'],
        alertIdsByAttackId: new Map([['attack-1', ['alert-1']]]),
        alertAttachments: [alertAttachment('attachment-1', ['alert-1', 'alert-2'])],
      })
    ).toEqual({ attachmentIds: [], updates: [], alertIds: [], isResolvable: false });
  });
});
