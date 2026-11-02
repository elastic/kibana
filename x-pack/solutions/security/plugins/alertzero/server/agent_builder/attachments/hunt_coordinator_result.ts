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

const parseData = (input: unknown) => huntCoordinatorResultAttachmentSchema.safeParse(input);

/**
 * Hidden route↔hunt-child handoff. Readonly, no agent description; `format` is one inert line
 * so listing hidden attachments does not feed the agent the full result.
 */
export const createHuntCoordinatorResultAttachmentType = (): AttachmentTypeDefinition => ({
  id: HUNT_COORDINATOR_RESULT_ATTACHMENT_ID,
  isReadonly: true,
  maxContentLength: 1_000,
  validate: (input) => {
    const parseResult = parseData(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    }
    return { valid: false, error: parseResult.error.message };
  },
  format: (attachment: Attachment<string, unknown>) => {
    const parseResult = parseData(attachment.data);
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
