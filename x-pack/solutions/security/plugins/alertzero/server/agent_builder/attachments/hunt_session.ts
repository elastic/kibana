/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { ALERTZERO_ATTACHMENT_TYPES } from '../../../common/constants';
import {
  HUNT_SESSION_ATTACHMENT_MAX_BYTES,
  huntSessionAttachmentSchema,
} from '../../../common/hunt_session_attachment_schema';

export const HUNT_SESSION_ATTACHMENT_TYPE = ALERTZERO_ATTACHMENT_TYPES.huntSession;

const parseData = (input: unknown) => huntSessionAttachmentSchema.safeParse(input);

/**
 * The Hunt session on an Investigation: which hunt, how it was run, and the evidence preserved from
 * it. Readonly: AlertZero writes it and analysts never edit it. The agent is told only what the
 * hunt was and how much evidence it holds; the stored rows and queries stay out of its context.
 */
export const createHuntSessionAttachmentType = (): AttachmentTypeDefinition => ({
  id: HUNT_SESSION_ATTACHMENT_TYPE,
  isReadonly: true,
  maxContentLength: HUNT_SESSION_ATTACHMENT_MAX_BYTES,
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
        `Invalid ${HUNT_SESSION_ATTACHMENT_TYPE} attachment data for ${attachment.id}`
      );
    }
    const { definition, trigger, preservations = [] } = parseResult.data;
    const evidenceCount = preservations.reduce(
      (count, { selectedEvidence }) => count + selectedEvidence.length,
      0
    );
    return {
      getRepresentation: () => ({
        type: 'text',
        value: [
          `Hunt session for "${definition.name}" (${
            trigger === 'manual' ? 'analyst' : 'automated'
          }).`,
          `Hypothesis: ${definition.hypothesis}`,
          `Preserved evidence rows: ${evidenceCount}.`,
        ].join('\n'),
      }),
    };
  },
});
