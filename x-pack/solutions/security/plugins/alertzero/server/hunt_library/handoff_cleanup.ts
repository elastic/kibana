/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { isConversationNotFoundError } from '@kbn/agent-builder-common';
import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import { ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { HuntSessionAttachment } from '../../common/hunt_session_attachment_schema';
import type { WatchWorkflowsManagementClient } from '../services/watches/watch_workflows_management_client';
import { HUNT_LABEL_OWNER_ID } from './execution_labels';
import { deleteEmptyCreatedInvestigation, deriveManualInvestigationId } from './investigation';
import { MANUAL_SESSION_IMMUTABLE_LABEL_KEYS } from './manual_session';
import { readHuntSessionAttachment } from './session_attachment_store';

export const HANDOFF_PENDING = 'pending_handoff';
export const HANDOFF_CREATED = 'investigation_created';
export const HANDOFF_FAILED = 'handoff_failed';
export const HANDOFF_CLEANUP_REQUIRED = 'handoff_cleanup_required';
export const HANDOFF_CLEANUP_EXHAUSTED = 'handoff_cleanup_exhausted';

/** A handoff still pending after this long is treated as abandoned. */
export const HANDOFF_STALE_AFTER_MS = 5 * 60 * 1000;
/** Failed cleanup attempts per execution before it is marked exhausted. */
export const HANDOFF_CLEANUP_MAX_ATTEMPTS = 20;

const ATTEMPT_REASON_PATTERN = /^cleanup_attempt_(\d+)$/;

export type HandoffLabels = Readonly<Record<string, string>>;

/** The cleanup attempts so far. They live in `hunt.reason_code`, the one bounded mutable label left. */
export const readCleanupAttempts = (labels: HandoffLabels | undefined): number => {
  const match = ATTEMPT_REASON_PATTERN.exec(labels?.['hunt.reason_code'] ?? '');
  return match ? Number(match[1]) : 0;
};

/** True for a `pending_handoff` that has outlived the window in which a live request would finish. */
export const isStalePendingHandoff = (labels: HandoffLabels | undefined, now: Date): boolean => {
  if (labels?.['hunt.outcome'] !== HANDOFF_PENDING) return false;
  const since = Date.parse(labels['hunt.last_handoff_at'] ?? '');
  return Number.isNaN(since) || now.getTime() - since >= HANDOFF_STALE_AFTER_MS;
};

export type HandoffCleanupResult =
  | 'nothing_to_do'
  | 'repaired'
  | 'finalized_failed'
  | 'retry_later'
  | 'exhausted';

const countFingerprints = (attachment: HuntSessionAttachment) =>
  new Set(
    (attachment.preservations ?? []).flatMap(({ evidenceFingerprints }) => evidenceFingerprints)
  ).size;

/**
 * Finishes a session whose handoff did not complete, from its execution labels and the Investigation
 * they point to. The conversation and attachment clients must be scoped to a real user request,
 * because Agent Builder reaches conversations only through one: the session owner's next
 * preservation, or an operator's retry.
 *
 * - The attachment holds the pending preservation: the evidence is durable, so it repairs the labels.
 * - It does not: it deletes the empty Investigation the failed handoff left, if any, and records
 *   `handoff_failed`.
 * - Reading or deleting fails: it counts the attempt, and after
 *   {@link HANDOFF_CLEANUP_MAX_ATTEMPTS} marks the session exhausted for an operator.
 *
 * It never needs, reads back or stores query state, evidence or model output beyond what the
 * attachment already durably holds.
 */
export const runHandoffCleanup = async ({
  management,
  conversations,
  attachments,
  logger,
  spaceId,
  executionId,
  labels,
  now = () => new Date(),
}: {
  management: WatchWorkflowsManagementClient;
  conversations: Pick<ConversationPublicClient, 'get' | 'delete'>;
  attachments: Pick<AttachmentPublicClient, 'get'>;
  logger: Logger;
  spaceId: string;
  executionId: string;
  labels: HandoffLabels;
  now?: () => Date;
}): Promise<HandoffCleanupResult> => {
  const outcome = labels['hunt.outcome'];
  const needsCleanup =
    outcome === HANDOFF_CLEANUP_REQUIRED ||
    outcome === HANDOFF_CLEANUP_EXHAUSTED ||
    isStalePendingHandoff(labels, now());
  const definitionId = labels['hunt.definition_id'];
  const sessionId = labels['hunt.session_id'];
  if (!needsCleanup || !definitionId || !sessionId) return 'nothing_to_do';

  const writeLabels = (values: Record<string, string>) =>
    management.updateExecutionLabels({
      executionId,
      spaceId,
      workflowId: ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID,
      labelOwnerId: HUNT_LABEL_OWNER_ID,
      labels: values,
      immutableKeys: MANUAL_SESSION_IMMUTABLE_LABEL_KEYS,
    });

  const investigationId =
    labels['hunt.investigation_id'] ??
    deriveManualInvestigationId({ spaceId, definitionId, sessionId });
  const preservationId = labels['hunt.preservation_id'];

  try {
    let attachment: HuntSessionAttachment | undefined;
    try {
      attachment = await readHuntSessionAttachment({
        attachments,
        conversationId: investigationId,
      });
    } catch (error) {
      if (!isConversationNotFoundError(error)) throw error;
    }

    const recorded = attachment?.preservations?.find(
      ({ preservation_id: id }) => id === preservationId
    );
    if (attachment && (recorded || !preservationId)) {
      await writeLabels({
        'hunt.outcome': HANDOFF_CREATED,
        'hunt.investigation_id': investigationId,
        'hunt.evidence_count': String(countFingerprints(attachment)),
        ...(recorded ? { 'hunt.last_preserved_at': recorded.timestamp } : {}),
        'hunt.reason_code': '-',
      });
      return 'repaired';
    }

    await deleteEmptyCreatedInvestigation({
      conversations,
      investigationId,
      createdByThisRequest: true,
    });
    await writeLabels({ 'hunt.outcome': HANDOFF_FAILED, 'hunt.reason_code': '-' });
    return 'finalized_failed';
  } catch (error) {
    const attempts = readCleanupAttempts(labels) + 1;
    const exhausted = attempts >= HANDOFF_CLEANUP_MAX_ATTEMPTS;
    logger.warn(
      `Hunt handoff cleanup for session ${sessionId} failed (attempt ${attempts}): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    await writeLabels({
      'hunt.outcome': exhausted ? HANDOFF_CLEANUP_EXHAUSTED : HANDOFF_CLEANUP_REQUIRED,
      'hunt.investigation_id': investigationId,
      ...(preservationId ? { 'hunt.cleanup_operation_id': preservationId } : {}),
      'hunt.reason_code': `cleanup_attempt_${attempts}`,
    }).catch((labelError) =>
      logger.warn(
        `Could not record the failed cleanup attempt on session ${sessionId}: ${
          labelError instanceof Error ? labelError.message : String(labelError)
        }`
      )
    );
    return exhausted ? 'exhausted' : 'retry_later';
  }
};
