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
 * An alert attachment that an attack removal shrinks rather than deletes, because only part of
 * what it holds belongs to the attack being removed.
 */
export interface RemovableAlertAttachmentUpdate {
  /** The attachment saved object id. */
  id: string;
  /** The alert document ids that stay on the attachment. */
  keptAlertIds: string[];
  /** The alert document ids dropped from it, which leave the case. */
  removedAlertIds: string[];
  /**
   * The provenance to write back, naming the attacks still on the case that claim the kept
   * alerts.
   *
   * The remainder has to be relabelled because the attack that introduced it is going. Left
   * naming the removed attack, the attachment would match no attack still on the case, so
   * removing the attacks that actually depend on those alerts would never reconsider it and
   * they would stay on the case forever.
   *
   * Empty when no remaining attack claims any of the kept alerts, which makes the attachment
   * untouchable by a later attack removal. That is the same conservative position as an
   * attachment the analyst made themselves.
   */
  sourceAttackIds: string[];
}

/**
 * The outcome of resolving which alerts an attack may take with it when removed.
 */
export interface RemovableAlertAttachments {
  /** Attachment saved object ids to pass to the bulk-delete endpoint. */
  attachmentIds: string[];
  /** Attachments to shrink instead, because they also hold alerts that must stay. */
  updates: RemovableAlertAttachmentUpdate[];
  /** The alert document ids leaving the case, for the count shown in the prompt. */
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
  updates: [],
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
 * - An alert attachment that holds both removable and non-removable alerts is shrunk rather than
 *   deleted whole: the removable ones are dropped and the rest stay. This is what makes removal
 *   independent of the order the attacks were attached in. The attack attached first holds the
 *   shared alert alongside its own exclusive ones, and without shrinking, removing it would have
 *   to choose between stripping evidence from the other attack and stranding its own.
 *
 * A shrunk attachment is relabelled to the attacks still claiming what it kept, so the alerts it
 * holds on their behalf remain removable when those attacks are themselves removed.
 *
 * With `allowRemoval` false the caller has declined the removals, so nothing leaves the case and
 * every candidate is relabelled only. The relabel is not part of what was declined: the attack
 * that vouched for those alerts is going regardless, and an attachment left naming it would be
 * invisible to every later removal.
 *
 * Returns an empty, non-resolvable result rather than throwing when an alert set is missing —
 * a deleted attack, one aged into a frozen tier, or one outside the user's access all arrive
 * as `undefined`. An unresolved *other* attack blocks the whole result because there is no way
 * to prove an alert is not shared with it.
 *
 * @param removedAttackIds attack document ids of the attachments being removed, matched against each attachment's provenance.
 * @param attackAlertIds de-anonymised alert ids of the attacks being removed, or `undefined`/`null` when they could not be resolved.
 * @param alertAttachments the case's `security.alert` attachments, from {@link getCaseAlertAttachments}.
 * @param otherAttacks every *other* attack attachment on the case, with its de-anonymised alert ids, `undefined`/`null` where unresolved.
 * @param allowRemoval when false, nothing is removed and every candidate is relabelled only: the alerts stay on the case, but the provenance naming the departing attack does not.
 */
export const resolveRemovableAlertAttachments = ({
  removedAttackIds,
  attackAlertIds,
  alertAttachments,
  otherAttacks,
  allowRemoval = true,
}: {
  removedAttackIds: readonly string[];
  attackAlertIds: readonly string[] | undefined | null;
  alertAttachments: readonly CaseAlertAttachment[];
  otherAttacks: ReadonlyArray<{ id: string; alertIds: readonly string[] | undefined | null }>;
  allowRemoval?: boolean;
}): RemovableAlertAttachments => {
  if (attackAlertIds == null || otherAttacks.some(({ alertIds }) => alertIds == null)) {
    return EMPTY_UNRESOLVABLE;
  }

  const removedAttackIdSet = new Set(removedAttackIds);
  const attackAlertIdSet = new Set(attackAlertIds);
  const claimedByOtherAttacks = new Set(otherAttacks.flatMap(({ alertIds }) => alertIds ?? []));

  /** The attacks still on the case that list any of these alerts, for the rewritten provenance. */
  const claimantsOf = (keptAlertIds: readonly string[]): string[] => {
    const keptAlertIdSet = new Set(keptAlertIds);

    return otherAttacks
      .filter(({ alertIds: ids }) => (ids ?? []).some((alertId) => keptAlertIdSet.has(alertId)))
      .map(({ id }) => id);
  };

  // An attachment with no alerts cannot be attributed to this attack, and one the attack did not
  // create is never touched, whatever it holds.
  const candidates = alertAttachments.filter(
    ({ alertIds: ids, sourceAttackIds }) =>
      ids.length > 0 && sourceAttackIds.some((attackId) => removedAttackIdSet.has(attackId))
  );

  const attachmentIds: string[] = [];
  const updates: RemovableAlertAttachmentUpdate[] = [];
  const alertIds = new Set<string>();

  for (const { id, alertIds: attachmentAlertIds } of candidates) {
    const removedAlertIds = allowRemoval
      ? attachmentAlertIds.filter(
          (alertId) => attackAlertIdSet.has(alertId) && !claimedByOtherAttacks.has(alertId)
        )
      : [];

    if (removedAlertIds.length === attachmentAlertIds.length) {
      attachmentIds.push(id);
    } else if (removedAlertIds.length > 0) {
      const removedAlertIdSet = new Set(removedAlertIds);
      const keptAlertIds = attachmentAlertIds.filter((alertId) => !removedAlertIdSet.has(alertId));

      updates.push({
        id,
        keptAlertIds,
        removedAlertIds,
        sourceAttackIds: claimantsOf(keptAlertIds),
      });
    } else {
      // Nothing here may go, but the attack that put it there is leaving. Either no alert is
      // free, or the caller declined the removals. Left naming that attack the attachment would
      // match no attack still on the case, so removing the attacks that do claim its alerts
      // would never reconsider it and they would stay forever. Only the label changes; what the
      // analyst sees is untouched.
      updates.push({
        id,
        keptAlertIds: [...attachmentAlertIds],
        removedAlertIds: [],
        sourceAttackIds: claimantsOf(attachmentAlertIds),
      });
    }

    removedAlertIds.forEach((alertId) => alertIds.add(alertId));
  }

  return { attachmentIds, updates, alertIds: Array.from(alertIds), isResolvable: true };
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
 * @param allowRemoval when false, nothing is removed and every candidate is relabelled only.
 */
export const resolveRemovableAlertAttachmentsForAttacks = ({
  removedAttackIds,
  otherAttackIds,
  alertIdsByAttackId,
  alertAttachments,
  allowRemoval = true,
}: {
  removedAttackIds: readonly string[];
  otherAttackIds: readonly string[];
  alertIdsByAttackId: ReadonlyMap<string, readonly string[]>;
  alertAttachments: readonly CaseAlertAttachment[];
  allowRemoval?: boolean;
}): RemovableAlertAttachments => {
  const removedAlertIds = removedAttackIds.map((id) => alertIdsByAttackId.get(id));

  return resolveRemovableAlertAttachments({
    removedAttackIds,
    attackAlertIds: removedAlertIds.some((ids) => ids == null)
      ? undefined
      : [...new Set(removedAlertIds.flatMap((ids) => ids ?? []))],
    alertAttachments,
    otherAttacks: otherAttackIds.map((id) => ({ id, alertIds: alertIdsByAttackId.get(id) })),
    allowRemoval,
  });
};
