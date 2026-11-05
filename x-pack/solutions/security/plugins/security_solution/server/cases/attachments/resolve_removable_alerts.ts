/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUnifiedAlertAttachment, toStringArray } from '@kbn/cases-plugin/common';
import { SECURITY_ALERT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common/constants';

/** A case attachment with its saved object id. */
export type CaseAttachmentWithId = Parameters<typeof isUnifiedAlertAttachment>[0] & { id: string };

/** A `security.alert` attachment on the case, reduced to what the resolution needs. */
export interface CaseAlertAttachment {
  /** The attachment saved object id. */
  id: string;
  /** The de-anonymised alert document ids this attachment references. */
  alertIds: readonly string[];
  /**
   * Whether an attack put these alerts on the case, from `metadata.sourceAttachmentIds`. False for
   * an attachment the analyst created, or one predating the field.
   */
  isFromAttack: boolean;
}

/**
 * Extracts the case's `security.alert` attachments in the shape
 * {@link resolveRemovableAlertIds} consumes.
 *
 * Only `security.alert` attachments are considered. A legacy `alert` attachment was never
 * brought in by an attack, and the observability and stack alert types that
 * `isUnifiedAlertAttachment` also accepts carry document ids from different alert families: an
 * id is only meaningful alongside its index, so matching one of those against an attack's
 * alert ids could remove an alert the attack has nothing to do with.
 */
export const getCaseAlertAttachments = (
  attachments: readonly CaseAttachmentWithId[]
): CaseAlertAttachment[] =>
  attachments.flatMap((attachment) =>
    isUnifiedAlertAttachment(attachment) && attachment.type === SECURITY_ALERT_ATTACHMENT_TYPE
      ? [
          {
            id: attachment.id,
            alertIds: toStringArray(attachment.attachmentId),
            isFromAttack: attachment.metadata?.sourceAttachmentIds != null,
          },
        ]
      : []
  );

/**
 * Returns the alert ids that leave the case with the removed attacks.
 *
 * The attacks' alert ids are read live from `kibana.alert.attack_discovery.alert_ids` rather than
 * snapshotted onto the attachment, so an alert goes when it is in a removed attack's current
 * alert set, in no attack staying on the case, and on the case in an attachment an attack
 * created. Three consequences, all deliberate:
 *
 * - An alert the analyst attached is never returned. Without `metadata.sourceAttachmentIds`
 *   there is no way to tell it from one an attack contributed, and removing the attack would
 *   delete the analyst's evidence. Which attack created the attachment does not matter: the
 *   alert is only returned if no attack staying on the case lists it.
 * - An alert that left the attack since attach time is never returned. The attachment records
 *   what the analyst captured; orphaned evidence stays on the case.
 * - Attack↔alert is many-to-many, so an alert another attack on the case lists stays.
 *
 * A removed attack whose alert ids could not be read (deleted, aged into a frozen tier, or
 * outside the user's access) takes no alerts with it. An unread attack staying on the case
 * blocks the whole result, because there is no way to prove an alert is not shared with it.
 *
 * @param removedAttackIds attack document ids of the attachments being removed.
 * @param otherAttackIds attack document ids of every other attack attachment on the case.
 * @param alertIdsByAttackId de-anonymised alert ids per attack read; unread attacks are absent.
 * @param alertAttachments the case's `security.alert` attachments, from {@link getCaseAlertAttachments}.
 */
export const resolveRemovableAlertIds = ({
  removedAttackIds,
  otherAttackIds,
  alertIdsByAttackId,
  alertAttachments,
}: {
  removedAttackIds: readonly string[];
  otherAttackIds: readonly string[];
  alertIdsByAttackId: ReadonlyMap<string, readonly string[]>;
  alertAttachments: readonly CaseAlertAttachment[];
}): string[] => {
  if (otherAttackIds.some((attackId) => !alertIdsByAttackId.has(attackId))) {
    return [];
  }

  const claimedByOtherAttacks = new Set(
    otherAttackIds.flatMap((attackId) => alertIdsByAttackId.get(attackId) ?? [])
  );
  const attachedByAnalyst = new Set(
    alertAttachments.flatMap(({ alertIds, isFromAttack }) => (isFromAttack ? [] : alertIds))
  );
  const attachedByAttacks = new Set(
    alertAttachments.flatMap(({ alertIds, isFromAttack }) => (isFromAttack ? alertIds : []))
  );
  const removedAttackAlertIds = new Set(
    removedAttackIds.flatMap((attackId) => alertIdsByAttackId.get(attackId) ?? [])
  );

  return [...removedAttackAlertIds].filter(
    (alertId) =>
      attachedByAttacks.has(alertId) &&
      !attachedByAnalyst.has(alertId) &&
      !claimedByOtherAttacks.has(alertId)
  );
};
