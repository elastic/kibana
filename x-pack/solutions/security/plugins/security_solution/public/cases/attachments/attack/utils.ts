/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ATTACK_ATTACHMENT_TYPE, type CaseUI } from '@kbn/cases-plugin/common';
import {
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';
import type { AttackAttachmentPayload } from '../../../../common/cases/attachments/attack';

export type CaseAttachment = CaseUI['comments'][number];

/**
 * A `security.attack` attachment narrowed to the fields the attachments section renders: the
 * attack document id, the snapshot metadata, and who attached it when.
 */
export type AttackCaseAttachmentRow = CaseAttachment & {
  attachmentId: string;
  metadata: AttackAttachmentPayload['metadata'];
};

/**
 * Narrows to a `security.attack` attachment, rejecting alert attachments (which batch their
 * ids into an array) and attachments with no metadata. Metadata is required for
 * `security.attack`, but it is stored unindexed in `_source` and is not re-validated on read,
 * so the guard keeps the renderer honest.
 */
export const isAttackAttachment = (comment: CaseAttachment): comment is AttackCaseAttachmentRow => {
  // Cast to a loose shape so we can access fields that only exist on some union members.
  const candidate = comment as {
    type?: string;
    attachmentId?: string | string[]; // alerts batch as string[], attacks are always string
    metadata?: object | null;
  };
  return (
    candidate.type === SECURITY_ATTACK_ATTACHMENT_TYPE &&
    typeof candidate.attachmentId === 'string' &&
    candidate.metadata != null
  );
};

/**
 * Case-insensitive match against the snapshotted attack title and summary, and against the
 * attack document id so a user pasting an id from elsewhere finds the row.
 *
 * Matches on the persisted metadata rather than the live attack so the section can filter
 * without waiting on the search request.
 */
export const matchesSearchTerm = (
  attachment: Pick<AttackAttachmentPayload, 'attachmentId' | 'metadata'>,
  searchTerm: string
): boolean => {
  const { attachmentId, metadata } = attachment;
  const searchableText = `${attachmentId} ${metadata.title ?? ''} ${
    metadata.summaryMarkdown ?? ''
  }`.toLowerCase();
  return searchableText.includes(searchTerm.toLowerCase());
};

/**
 * Maps the index snapshotted on the attachment to a pattern the attack flyout can actually read.
 *
 * `metadata.index` is the attack document's `_index` — the concrete backing index, e.g.
 * `.internal.alerts-security.attack.discovery.alerts-default-000001` — because that is what the
 * find API returns. Alert index privileges are granted on the alias
 * (`.alerts-security.attack.discovery.alerts*`), not on that backing index, so looking the
 * document up by its raw `_index` resolves nothing and the flyout renders its error state. Every
 * other caller that opens the attack flyout passes an index *pattern* for the same reason.
 *
 * Normalising here rather than at attach time is deliberate: attachment metadata is stored
 * unindexed and cannot be backfilled, so a write-time fix would leave already-attached attacks
 * permanently unopenable.
 *
 * Anything that matches neither attack-discovery index family is passed through unchanged — it is
 * already whatever the caller meant, and guessing would be worse than trying it.
 */
export const toReadableAttackIndexPattern = (index: string): string => {
  // Checked first: the adhoc index name contains the scheduled prefix as a substring.
  if (index.includes(ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX)) {
    return `${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-*`;
  }
  if (index.includes(ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX)) {
    return `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-*`;
  }
  return index;
};
