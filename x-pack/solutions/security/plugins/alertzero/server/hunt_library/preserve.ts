/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import { ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { HuntSessionAttachment } from '../../common/hunt_session_attachment_schema';
import type { HuntSessionClaims } from '../../common/hunt_library_profile_state';
import type { WatchWorkflowsManagementClient } from '../services/watches/watch_workflows_management_client';
import type { EvidenceSelection, PreservationContext } from './evidence';
import { prepareEvidence } from './evidence';
import { HUNT_LABEL_OWNER_ID } from './execution_labels';
import {
  HANDOFF_CLEANUP_REQUIRED,
  HANDOFF_CREATED,
  HANDOFF_FAILED,
  HANDOFF_PENDING,
  isStalePendingHandoff,
  runHandoffCleanup,
} from './handoff_cleanup';
import type { HuntDefinition } from './hunt_definition';
import {
  deleteEmptyCreatedInvestigation,
  deriveManualInvestigationId,
  findOrCreateHuntInvestigation,
} from './investigation';
import { launchManualSession, MANUAL_SESSION_IMMUTABLE_LABEL_KEYS } from './manual_session';
import {
  HuntSessionStoreError,
  readHuntSessionAttachment,
  upsertHuntSessionAttachment,
  type HuntSessionDraft,
} from './session_attachment_store';

export type HuntPreserveErrorCode =
  | 'preservation_in_progress'
  | 'investigation_inaccessible'
  | 'definition_mismatch'
  | 'handoff_failed';

/** The preservation did not complete. Nothing is reported as saved. */
export class HuntPreserveError extends Error {
  constructor(public readonly code: HuntPreserveErrorCode, message: string) {
    super(message);
    this.name = 'HuntPreserveError';
  }
}

export interface PreserveResult {
  investigationId: string;
  /** Unique evidence rows on the Investigation after this request. */
  evidenceCount: number;
  /** Rows this request added. Zero for a retry or a repeated selection. */
  addedCount: number;
  /** True when this request created the Investigation. */
  created: boolean;
  /** True when this preservation id was already durable, so nothing new was written. */
  isRetry: boolean;
  /** True when the Investigation already held evidence before this request. */
  hadPriorEvidence: boolean;
}

const countFingerprints = (attachment: HuntSessionAttachment) =>
  new Set(
    (attachment.preservations ?? []).flatMap(({ evidenceFingerprints }) => evidenceFingerprints)
  ).size;

/**
 * Preserves the analyst's selected rows as evidence on an Investigation, in the order that never
 * reports success before the attachment is durable:
 *
 * 1. Resolve the Investigation and check the analyst can reach it.
 * 2. Re-read and sanitize the evidence under the analyst's permissions; reject before any write.
 * 3. Mark the session execution `pending_handoff`, unless another preservation holds it.
 * 4. Find or create the Investigation.
 * 5. Write the attachment.
 * 6. Record the outcome on the session execution.
 *
 * If step 4 or 5 fails after this request created the Investigation, it deletes the empty
 * Investigation, or marks the session for cleanup when it cannot.
 */
export const preserveHuntEvidence = async ({
  management,
  request,
  conversations,
  attachments,
  esClient,
  logger,
  definition,
  claims,
  actor,
  preservationId,
  note,
  context,
  columns,
  selection,
  now = () => new Date(),
}: {
  management: WatchWorkflowsManagementClient;
  request: KibanaRequest;
  conversations: ConversationPublicClient;
  attachments: AttachmentPublicClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  definition: HuntDefinition;
  claims: HuntSessionClaims;
  actor: string;
  preservationId: string;
  /** Context the analyst wrote for this preservation. */
  note?: string;
  context: PreservationContext;
  columns: string[];
  selection: EvidenceSelection[];
  now?: () => Date;
}): Promise<PreserveResult> => {
  const { spaceId, sessionId, sessionExecutionId } = claims;
  const workflowId = ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID;

  // 1. The Investigation: a linked one from the session wins over the session-derived id.
  const linkedId = claims.investigationId;
  const investigationId =
    linkedId ?? deriveManualInvestigationId({ spaceId, definitionId: definition.id, sessionId });
  if (linkedId) {
    try {
      await conversations.get(linkedId);
    } catch {
      throw new HuntPreserveError(
        'investigation_inaccessible',
        'You cannot access the linked Investigation.'
      );
    }
    const linked = await readHuntSessionAttachment({
      attachments,
      conversationId: linkedId,
    }).catch(() => undefined);
    if (linked && linked.definition.id !== definition.id) {
      throw new HuntPreserveError(
        'definition_mismatch',
        'The linked Investigation belongs to a different hunt.'
      );
    }
  }

  // 2. Evidence, before anything is written.
  const prepared = await prepareEvidence({ esClient, definition, sessionId, context, selection });

  // 3. Serialize per session: a different preservation already in flight means try again later.
  const executions = await management.findExecutionsByLabel({
    workflowId,
    key: 'hunt.session_id',
    value: sessionId,
    spaceId,
    request,
  });
  const execution = executions.find(({ id }) => id === sessionExecutionId);
  const labels = execution?.labels;
  const foreignPending =
    labels?.['hunt.outcome'] === HANDOFF_PENDING &&
    labels['hunt.preservation_id'] !== preservationId;
  if (foreignPending && !isStalePendingHandoff(labels, now())) {
    throw new HuntPreserveError(
      'preservation_in_progress',
      'Another preservation is still being saved for this session. Try again in a moment.'
    );
  }
  // An abandoned handoff, or one flagged for cleanup, is finished under this analyst's own request
  // before anything new is written, so a stuck session unsticks itself.
  if (labels && (foreignPending || labels['hunt.outcome'] === HANDOFF_CLEANUP_REQUIRED)) {
    await runHandoffCleanup({
      management,
      conversations,
      attachments,
      logger,
      spaceId,
      executionId: sessionExecutionId,
      labels,
      now,
    });
  }
  if (!execution) {
    // The execution expired under retention. Recreate it under the same identity.
    await launchManualSession({
      client: management,
      request,
      spaceId,
      definition,
      sessionId,
      logger,
    });
  }

  const writeLabels = (values: Record<string, string>) =>
    management.updateExecutionLabels({
      executionId: sessionExecutionId,
      spaceId,
      workflowId,
      labelOwnerId: HUNT_LABEL_OWNER_ID,
      labels: values,
      immutableKeys: MANUAL_SESSION_IMMUTABLE_LABEL_KEYS,
    });

  await writeLabels({
    'hunt.outcome': HANDOFF_PENDING,
    'hunt.preservation_id': preservationId,
    'hunt.last_handoff_at': now().toISOString(),
  });

  // 4 and 5. Create the Investigation if needed and make the evidence durable.
  let created = false;
  let isRetry = false;
  let hadPriorEvidence = false;
  let attachment: HuntSessionAttachment;
  try {
    if (!linkedId) {
      ({ created } = await findOrCreateHuntInvestigation({
        conversations,
        investigationId,
        title: definition.name,
      }));
    }
    attachment = await upsertHuntSessionAttachment({
      attachments,
      conversationId: investigationId,
      mutate: (current) => {
        const preservations = current?.preservations ?? [];
        const seen = new Set(
          preservations.flatMap(({ evidenceFingerprints }) => evidenceFingerprints)
        );
        const alreadyRecorded = preservations.some(
          ({ preservation_id: id }) => id === preservationId
        );
        isRetry = alreadyRecorded;
        hadPriorEvidence = preservations.some(
          ({ preservation_id: id, evidenceFingerprints }) =>
            id !== preservationId && evidenceFingerprints.length > 0
        );
        const newRows = alreadyRecorded
          ? []
          : prepared.fingerprints.flatMap((fingerprint, position) =>
              seen.has(fingerprint) ? [] : [{ fingerprint, row: prepared.rows[position] }]
            );
        const unique = [...new Map(newRows.map((entry) => [entry.fingerprint, entry])).values()];
        const resumeSnapshot = { ...context, columns };

        const draft: HuntSessionDraft = {
          version: 1,
          definition: {
            id: definition.id,
            version: definition.version,
            name: definition.name,
            hypothesis: definition.hypothesis,
          },
          investigation_id: investigationId,
          trigger: current?.trigger ?? 'manual',
          has_manual_append: current
            ? current.trigger === 'automated' || current.has_manual_append
            : false,
          ...(current?.creation_operation_id
            ? { creation_operation_id: current.creation_operation_id }
            : created
            ? { creation_operation_id: preservationId }
            : {}),
          ...(current?.adjudication ? { adjudication: current.adjudication } : {}),
          preservations: [
            ...preservations,
            ...(unique.length > 0
              ? [
                  {
                    preservation_id: preservationId,
                    actor,
                    timestamp: now().toISOString(),
                    ...(note?.trim() ? { note: note.trim() } : {}),
                    ...resumeSnapshot,
                    evidenceFingerprints: unique.map(({ fingerprint }) => fingerprint),
                    selectedEvidence: unique.map(({ row }) => row),
                  },
                ]
              : []),
          ],
          resumeSnapshot,
        };
        return draft;
      },
    });
  } catch (error) {
    const deletion = await deleteEmptyCreatedInvestigation({
      conversations,
      investigationId,
      createdByThisRequest: created,
    }).catch((deleteError) => {
      logger.warn(
        `Could not remove the empty Hunt Investigation ${investigationId}: ${
          deleteError instanceof Error ? deleteError.message : String(deleteError)
        }`
      );
      return 'not_empty' as const;
    });
    const needsCleanup = created && deletion !== 'deleted' && deletion !== 'not_found';
    await writeLabels(
      needsCleanup
        ? {
            'hunt.outcome': HANDOFF_CLEANUP_REQUIRED,
            'hunt.investigation_id': investigationId,
            'hunt.cleanup_operation_id': preservationId,
          }
        : { 'hunt.outcome': HANDOFF_FAILED }
    ).catch((labelError) =>
      logger.warn(
        `Could not record the failed Hunt handoff on session ${sessionId}: ${
          labelError instanceof Error ? labelError.message : String(labelError)
        }`
      )
    );
    if (error instanceof HuntSessionStoreError) throw error;
    throw new HuntPreserveError('handoff_failed', 'The evidence could not be saved. Try again.');
  }

  // 6. Record the outcome. The attachment is durable, so a failure here is repaired later.
  const evidenceCount = countFingerprints(attachment);
  try {
    await writeLabels({
      'hunt.outcome': HANDOFF_CREATED,
      'hunt.investigation_id': investigationId,
      'hunt.evidence_count': String(evidenceCount),
      'hunt.last_preserved_at': now().toISOString(),
      'hunt.preservation_id': preservationId,
    });
  } catch (labelError) {
    logger.warn(
      `Hunt evidence is saved on ${investigationId} but session ${sessionId} was not updated: ${
        labelError instanceof Error ? labelError.message : String(labelError)
      }`
    );
  }

  const added = (attachment.preservations ?? []).find(
    ({ preservation_id: id }) => id === preservationId
  );
  return {
    investigationId,
    evidenceCount,
    addedCount: added?.evidenceFingerprints.length ?? 0,
    created,
    isRetry,
    hadPriorEvidence,
  };
};
