/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUnifiedAlertAttachment, toStringArray } from '@kbn/cases-plugin/common';
import { SECURITY_ALERT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common/constants';

/** A case attachment, as the case view or the Cases server holds it, with its saved object id. */
export type CaseAttachmentWithId = Parameters<typeof isUnifiedAlertAttachment>[0] & { id: string };

/**
 * A `security.alert` attachment on the case, reduced to the two things the resolution needs:
 * the saved object id (what the bulk-delete endpoint takes) and the de-anonymised alert
 * document ids it references.
 *
 * A single alert attachment can reference several alerts, so the alert ids are an array.
 */
export interface CaseAlertAttachment {
  /** The attachment saved object id. */
  id: string;
  /** The de-anonymised alert document ids this attachment references. */
  alertIds: readonly string[];
  /**
   * The attack document ids this attachment was created by, from `metadata.sourceAttachmentIds`.
   *
   * Empty for an attachment no attack created — one the analyst attached themselves, or one
   * predating the provenance field.
   */
  sourceAttackIds: readonly string[];
}

/**
 * The outcome of resolving which alerts an attack may take with it when removed.
 */
export interface RemovableAlertAttachments {
  /** Attachment saved object ids to pass to the bulk-delete endpoint. */
  attachmentIds: string[];
  /** The alert document ids those attachments cover, for the count shown in the prompt. */
  alertIds: string[];
  /**
   * False when at least one attack attachment on the case could not be resolved — either the
   * one being removed, or another one whose claims would otherwise be invisible. The prompt
   * uses this to disable the checkbox with an explanation rather than silently offering to
   * remove nothing.
   */
  isResolvable: boolean;
}

const EMPTY_UNRESOLVABLE: RemovableAlertAttachments = {
  attachmentIds: [],
  alertIds: [],
  isResolvable: false,
};

/**
 * Extracts the case's `security.alert` attachments in the shape
 * {@link resolveRemovableAlertAttachments} consumes.
 *
 * Only `security.alert` attachments are considered. A legacy `alert` attachment was never
 * brought in by an attack, and the observability and stack alert types that
 * `isUnifiedAlertAttachment` also accepts carry document ids from different alert families: an
 * id is only meaningful alongside its index, so matching one of those against an attack's
 * alert ids could remove an attachment the attack has nothing to do with.
 */
export const getCaseAlertAttachments = (
  comments: readonly CaseAttachmentWithId[]
): CaseAlertAttachment[] =>
  comments.flatMap((comment) =>
    isUnifiedAlertAttachment(comment) && comment.type === SECURITY_ALERT_ATTACHMENT_TYPE
      ? [
          {
            id: comment.id,
            alertIds: toStringArray(comment.attachmentId),
            sourceAttackIds: toStringArray(comment.metadata?.sourceAttachmentIds ?? []),
          },
        ]
      : []
  );

/**
 * Decides which alert attachments may be removed alongside an attack attachment.
 *
 * An attachment is a candidate only when `metadata.sourceAttachmentIds` records one of the
 * attacks being removed as having created it. That provenance is written at attach time and
 * narrowed by the Cases dedupe, which drops the ids already on the case, so it names the alerts
 * the attack genuinely introduced rather than the ones it merely lists. Without it there is no
 * way to tell an alert an attack contributed from an identical alert the analyst attached
 * themselves, and removing the attack would delete the analyst's attachment.
 *
 * Among the candidates, the attack's alert ids are then read live from
 * `kibana.alert.attack_discovery.alert_ids` rather than snapshotted onto the attachment, so this
 * is the intersection of the attack's *current* alert set with what is actually on the case,
 * minus anything another attached attack still claims. Four consequences, all deliberate:
 *
 * - An alert attachment with no provenance is never returned. It was not put there by an attack,
 *   or it predates the field, and in both cases guessing would risk deleting an analyst's own
 *   evidence.
 * - An alert that left the attack since attach time is never returned. The attachment records
 *   what the analyst captured; orphaned evidence stays on the case.
 * - Attack↔alert is many-to-many, so an alert claimed by another attack attached to the same
 *   case is excluded — removing this attack must not strip evidence from that one.
 * - An alert attachment referencing several alerts can only be deleted whole, so it is
 *   returned only when *every* alert it references is removable. A partially-shared
 *   attachment stays, again erring toward keeping evidence.
 *
 * That last consequence is the known gap: when two attacks share an alert, the one attached
 * first holds both the shared alert and its own exclusive ones in a single attachment, so
 * removing it takes nothing and leaves its exclusive alerts behind. Closing that needs the
 * Cases `onDelete` contract to be able to shrink an attachment instead of deleting it whole.
 *
 * Returns an empty, non-resolvable result rather than throwing when an alert set is missing —
 * a deleted attack, one aged into a frozen tier, or one outside the user's access all arrive
 * as `undefined`. An unresolved *other* attack blocks the whole result because there is no way
 * to prove an alert is not shared with it.
 *
 * @param removedAttackIds attack document ids of the attachments being removed, matched against each attachment's provenance.
 * @param attackAlertIds de-anonymised alert ids of the attacks being removed, or `undefined`/`null` when they could not be resolved.
 * @param alertAttachments the case's `security.alert` attachments, from {@link getCaseAlertAttachments}.
 * @param otherAttackAlertIds de-anonymised alert ids of every *other* attack attachment on the case, one entry each, `undefined`/`null` where unresolved.
 */
export const resolveRemovableAlertAttachments = ({
  removedAttackIds,
  attackAlertIds,
  alertAttachments,
  otherAttackAlertIds,
}: {
  removedAttackIds: readonly string[];
  attackAlertIds: readonly string[] | undefined | null;
  alertAttachments: readonly CaseAlertAttachment[];
  otherAttackAlertIds: ReadonlyArray<readonly string[] | undefined | null>;
}): RemovableAlertAttachments => {
  if (attackAlertIds == null || otherAttackAlertIds.some((ids) => ids == null)) {
    return EMPTY_UNRESOLVABLE;
  }

  const removedAttackIdSet = new Set(removedAttackIds);
  const attackAlertIdSet = new Set(attackAlertIds);
  const claimedByOtherAttacks = new Set(otherAttackAlertIds.flatMap((ids) => ids ?? []));

  const attachmentIds: string[] = [];
  const alertIds = new Set<string>();

  for (const { id, alertIds: attachmentAlertIds, sourceAttackIds } of alertAttachments) {
    // An empty attachment cannot be attributed to this attack, so leave it alone.
    const isRemovable =
      attachmentAlertIds.length > 0 &&
      sourceAttackIds.some((attackId) => removedAttackIdSet.has(attackId)) &&
      attachmentAlertIds.every(
        (alertId) => attackAlertIdSet.has(alertId) && !claimedByOtherAttacks.has(alertId)
      );

    if (isRemovable) {
      attachmentIds.push(id);
      attachmentAlertIds.forEach((alertId) => alertIds.add(alertId));
    }
  }

  return { attachmentIds, alertIds: Array.from(alertIds), isResolvable: true };
};

/**
 * Resolves the alert attachments removable alongside several attack attachments at once.
 *
 * The removed attacks' alert sets are unioned and deduped, and left unresolved when any of them
 * is, because a union missing one of its parts understates what is claimed.
 *
 * @param removedAttackIds attack document ids of the attachments being removed.
 * @param otherAttackIds attack document ids of every other attack attachment on the case.
 * @param alertIdsByAttackId de-anonymised alert ids per resolved attack; unresolved attacks are absent.
 * @param alertAttachments the case's `security.alert` attachments, from {@link getCaseAlertAttachments}.
 */
export const resolveRemovableAlertAttachmentsForAttacks = ({
  removedAttackIds,
  otherAttackIds,
  alertIdsByAttackId,
  alertAttachments,
}: {
  removedAttackIds: readonly string[];
  otherAttackIds: readonly string[];
  alertIdsByAttackId: ReadonlyMap<string, readonly string[]>;
  alertAttachments: readonly CaseAlertAttachment[];
}): RemovableAlertAttachments => {
  const removedAlertIds = removedAttackIds.map((id) => alertIdsByAttackId.get(id));

  return resolveRemovableAlertAttachments({
    removedAttackIds,
    attackAlertIds: removedAlertIds.some((ids) => ids == null)
      ? undefined
      : [...new Set(removedAlertIds.flatMap((ids) => ids ?? []))],
    alertAttachments,
    otherAttackAlertIds: otherAttackIds.map((id) => alertIdsByAttackId.get(id)),
  });
};
