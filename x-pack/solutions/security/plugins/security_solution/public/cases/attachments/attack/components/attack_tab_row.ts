/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import type { AttackAttachmentMetadata } from '../../../../../common/cases/attachments/attack';
import { getSummaryPlainText } from '../../../../attack_discovery/components/attack_entity_summary';
import type { AttackCaseAttachmentRow } from '../utils';
import { getAttackAlertIds } from '../utils';

/** One attached attack: its attach-time snapshot plus the live document once resolved. */
export interface AttackRow {
  /** The attack document `_id`. */
  attachmentId: string;
  /** The attachment saved object id. */
  savedObjectId: string;
  metadata: AttackAttachmentMetadata;
  createdAt: string;
  attachedBy: string;
  /** The live attack document. Absent while the query runs and when the id cannot be resolved. */
  attack?: AttackDiscoveryAlert;
  /** True once the live query has settled without returning this attack. */
  isUnresolved: boolean;
}

const UNKNOWN_USER = i18n.translate(
  'xpack.securitySolution.attackDiscovery.cases.tab.unknownUser',
  {
    defaultMessage: 'Unknown',
  }
);

export const getAttachedBy = (createdBy: AttackCaseAttachmentRow['createdBy']): string =>
  createdBy?.fullName || createdBy?.username || createdBy?.email || UNKNOWN_USER;

/** Prefers the de-anonymised live title, falling back to the attach-time snapshot. */
export const getTitle = (
  attack: AttackDiscoveryAlert | undefined,
  metadata: AttackAttachmentMetadata
): string => {
  if (attack == null) {
    return metadata.title;
  }
  // `_find` is queried with `with_replacements: false`, so live titles arrive anonymised.
  return replaceAnonymizedValuesWithOriginalValues({
    messageContent: attack.title,
    replacements: attack.replacements,
  });
};

/** When the attack was detected, not attached; older snapshots may have no timestamp. */
export const getDetectedOn = (
  attack: AttackDiscoveryAlert | undefined,
  metadata: AttackAttachmentMetadata
): string | undefined => {
  const timestamp = attack?.timestamp ?? metadata.timestamp;
  return timestamp != null && timestamp.length > 0 ? timestamp : undefined;
};

/**
 * The summary as plain text. Only the live summary is de-anonymised: the snapshot already was,
 * and a second pass would rewrite any word that happens to be a replacement key.
 */
export const getSummary = (
  attack: AttackDiscoveryAlert | undefined,
  metadata: AttackAttachmentMetadata
): string | undefined => {
  const liveMarkdown = attack?.summaryMarkdown;

  if (liveMarkdown != null && liveMarkdown.length > 0) {
    return getSummaryPlainText(
      replaceAnonymizedValuesWithOriginalValues({
        messageContent: liveMarkdown,
        replacements: attack?.replacements,
      })
    );
  }

  const snapshotMarkdown = metadata.summaryMarkdown;

  return snapshotMarkdown != null && snapshotMarkdown.length > 0
    ? getSummaryPlainText(snapshotMarkdown)
    : undefined;
};

export const getAlertCount = (
  attack: AttackDiscoveryAlert | undefined,
  metadata: AttackAttachmentMetadata
): number | undefined => (attack != null ? getAttackAlertIds(attack).length : metadata.alertCount);

export const getRiskScore = (
  attack: AttackDiscoveryAlert | undefined,
  metadata: AttackAttachmentMetadata
): number | undefined => attack?.riskScore ?? metadata.riskScore;
