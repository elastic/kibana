/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { ALERTZERO_ATTACHMENT_TYPES } from '../../../common/constants';
import { huntCoordinatorResultAttachmentSchema } from '../../../common/hunt_coordinator_result_attachment_schema';

export const HUNT_COORDINATOR_RESULT_ATTACHMENT_ID =
  ALERTZERO_ATTACHMENT_TYPES.huntCoordinatorResult;

/**
 * Hidden handoff between the hunt coordinator route and the hunt child workflow, not analyst
 * content. The route creates one per run with `hidden: true`, so it raises no timeline event
 * and renders no card, but the Investigation agent's attachment listing still includes hidden
 * attachments, so everything the agent can read from this type has to be inert: a one-line
 * `format` that names the run and its state, no agent description, and no rendering
 * instructions (which is why this is not built with `createReadonlyAttachmentType`).
 *
 * Read-only so the agent cannot create or update one through the attachment tools. The hunt
 * child deletes the attachment once it has consumed the result.
 */
export const createHuntCoordinatorResultAttachmentType = (): AttachmentTypeDefinition => ({
  id: HUNT_COORDINATOR_RESULT_ATTACHMENT_ID,
  isReadonly: true,
  // The formatted line is a run id plus a state word; the full result never reaches the agent.
  maxContentLength: 1_000,
  validate: (input) => {
    const parseResult = huntCoordinatorResultAttachmentSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    }
    return { valid: false, error: parseResult.error.message };
  },
  format: (attachment: Attachment<string, unknown>) => {
    const parseResult = huntCoordinatorResultAttachmentSchema.safeParse(attachment.data);
    if (!parseResult.success) {
      throw new Error(
        `Invalid ${HUNT_COORDINATOR_RESULT_ATTACHMENT_ID} attachment data for attachment ${attachment.id}`
      );
    }
    const { run_id: runId, state } = parseResult.data;
    return {
      getRepresentation: () => ({
        type: 'text',
        value: `Hunt coordinator result for run ${runId}: ${state}. Internal workflow state, not analyst content.`,
      }),
    };
  },
});
