/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import {
  BriefViewModel,
  formatBriefRepresentation,
} from '../../../common/entity_analytics/ai_brief/result';

export const createEntityAnalyticsAiBriefResultAttachmentType = (): AttachmentTypeDefinition => ({
  id: SecurityAgentBuilderAttachments.entityAnalyticsAiBriefResult,
  isReadonly: true,
  maxContentLength: 24000,
  validate: (input) => {
    const result = BriefViewModel.safeParse(input);
    return result.success
      ? { valid: true, data: result.data }
      : { valid: false, error: result.error.message };
  },
  format: (attachment: Attachment<string, unknown>) => {
    const result = BriefViewModel.safeParse(attachment.data);
    return {
      // getRepresentation remains necessary while attachment_read still calls the deprecated hook.
      getRepresentation: () => ({
        type: 'text',
        value: result.success
          ? formatBriefRepresentation(result.data)
          : 'Entity Analytics AI brief is unavailable because its stored data is invalid or unsupported.',
      }),
    };
  },
  toSurfaceComposition: (attachment) => {
    const result = BriefViewModel.safeParse(attachment.data);
    return {
      type: 'view',
      title: 'Entity Analytics AI brief',
      body: [
        {
          type: 'markdown',
          text: result.success
            ? formatBriefRepresentation(result.data)
            : 'Entity Analytics AI brief is unavailable because its stored data is invalid or unsupported.',
        },
      ],
    };
  },
  getAgentDescription: () =>
    'A read-only Entity Analytics AI brief captured for a specific scope and time. ' +
    'Use its captured priorities and evidence in follow-up answers. Investigating a priority ' +
    'opens its current details, not a replay of the captured scope.',
});
