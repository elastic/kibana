/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ATTACK_ATTACHMENT_TYPE, type CaseUI } from '@kbn/cases-plugin/common';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { getOriginalAlertIds } from '@kbn/elastic-assistant-common';
import type { AttackAttachmentPayload } from '../../../../common/cases/attachments/attack';
import type { AlertWorkflowStatus } from '../../../common/types';
import type { AttackToAttach } from '.';

export type CaseAttachment = CaseUI['comments'][number];

/** Column ids for the attacks grid; persisted selections key off them, so do not rename. */
export const ATTACK_TAB_COLUMN_ID = {
  actions: 'actions',
  detectedOn: 'detectedOn',
  title: 'title',
  alerts: 'alerts',
  summary: 'summary',
  riskScore: 'riskScore',
  status: 'status',
  attachedBy: 'attachedBy',
  attachedAt: 'attachedAt',
} as const;

export type AttackTabColumnId = (typeof ATTACK_TAB_COLUMN_ID)[keyof typeof ATTACK_TAB_COLUMN_ID];

/** Default visible columns, in render order; `actions` is a control column so never listed. */
export const DEFAULT_ATTACK_TAB_COLUMN_IDS: readonly AttackTabColumnId[] = [
  ATTACK_TAB_COLUMN_ID.detectedOn,
  ATTACK_TAB_COLUMN_ID.title,
  ATTACK_TAB_COLUMN_ID.alerts,
  ATTACK_TAB_COLUMN_ID.summary,
];

/** The columns the column picker offers, in the order the grid declares them. */
export const PICKABLE_ATTACK_TAB_COLUMN_IDS: readonly AttackTabColumnId[] = [
  ATTACK_TAB_COLUMN_ID.detectedOn,
  ATTACK_TAB_COLUMN_ID.title,
  ATTACK_TAB_COLUMN_ID.alerts,
  ATTACK_TAB_COLUMN_ID.summary,
  ATTACK_TAB_COLUMN_ID.riskScore,
  ATTACK_TAB_COLUMN_ID.status,
  ATTACK_TAB_COLUMN_ID.attachedBy,
  ATTACK_TAB_COLUMN_ID.attachedAt,
];

const PICKABLE_ATTACK_TAB_COLUMN_ID_SET: ReadonlySet<string> = new Set(
  PICKABLE_ATTACK_TAB_COLUMN_IDS
);

/** localStorage key for the persisted column selection. */
export const ATTACK_CASE_ATTACHMENT_COLUMNS_LOCAL_STORAGE_KEY =
  'securitySolution.attackDiscovery.cases.attachment.columns';

/**
 * Narrows a persisted column selection to ids the grid can render, falling back to the defaults.
 * The runtime checks matter because an older release may have written anything under the key.
 */
export const toVisibleAttackTabColumnIds = (
  persisted: readonly string[] | null | undefined
): AttackTabColumnId[] => {
  const pickable = Array.isArray(persisted)
    ? persisted.filter((columnId): columnId is AttackTabColumnId =>
        PICKABLE_ATTACK_TAB_COLUMN_ID_SET.has(columnId)
      )
    : [];

  return pickable.length > 0 ? pickable : [...DEFAULT_ATTACK_TAB_COLUMN_IDS];
};

/** A `security.attack` attachment with its attack id and snapshot metadata narrowed. */
export type AttackCaseAttachmentRow = CaseAttachment & {
  attachmentId: string;
  metadata: AttackAttachmentPayload['metadata'];
};

/** Narrows to a `security.attack` attachment; metadata is checked as it is not validated on read. */
export const isAttackAttachment = (comment: CaseAttachment): comment is AttackCaseAttachmentRow => {
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

/** Case-insensitive match on the attack id and the snapshot title and summary. */
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

/** An attack's de-anonymised, deduplicated alert ids; empty when the live document is absent. */
export const getAttackAlertIds = (attack: AttackDiscoveryAlert | undefined): string[] =>
  attack == null
    ? []
    : [
        ...new Set(
          getOriginalAlertIds({
            alertIds: attack.alertIds ?? [],
            replacements: attack.replacements,
          })
        ),
      ];

const ALERT_WORKFLOW_STATUSES: readonly AlertWorkflowStatus[] = ['open', 'acknowledged', 'closed'];

/**
 * Narrows the attack document's free-form `kibana.alert.workflow_status` to the statuses the
 * workflow actions know how to act on, dropping anything else.
 */
export const toAlertWorkflowStatus = (
  workflowStatus: string | undefined
): AlertWorkflowStatus | undefined =>
  ALERT_WORKFLOW_STATUSES.find((status) => status === workflowStatus);

/** Maps attacks onto {@link buildAttacksAttachments} input, dropping any with no known index. */
export const toAttacksToAttach = (
  attacks: ReadonlyArray<AttackDiscoveryAlert | undefined>
): Array<Omit<AttackToAttach, 'alertsIndex'>> =>
  attacks.flatMap((attack) =>
    attack?.index != null
      ? [
          {
            id: attack.id,
            index: attack.index,
            title: attack.title,
            summaryMarkdown: attack.summaryMarkdown,
            detailsMarkdown: attack.detailsMarkdown,
            entitySummaryMarkdown: attack.entitySummaryMarkdown,
            mitreAttackTactics: attack.mitreAttackTactics,
            timestamp: attack.timestamp,
            riskScore: attack.riskScore,
            alertIds: attack.alertIds,
            replacements: attack.replacements,
          },
        ]
      : []
  );
