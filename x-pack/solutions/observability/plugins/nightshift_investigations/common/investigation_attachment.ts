/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { investigationStateSchema } from '@kbn/significant-events-schema';

/**
 * Carries an investigation's findings on the Agent Builder conversation that produced them.
 *
 * The deductive investigation workflow writes this attachment in the same steps that persist the
 * investigation record, so a conversation and its investigation cannot show different findings.
 * Because attachments are versioned, each follow-up updates the one attachment in place instead
 * of appending another copy of the findings to the conversation.
 */
export const NIGHTSHIFT_INVESTIGATION_ATTACHMENT_TYPE =
  'platform.nightshift_investigation' as const;

/**
 * Fixed id the workflow writes findings under, so every execution updates one attachment rather
 * than appending another. The workflow YAML hardcodes it (a YAML asset cannot import code) and a
 * test in `@kbn/workflows` asserts the two agree.
 */
export const NIGHTSHIFT_INVESTIGATION_ATTACHMENT_ID = 'nightshift-investigation';

export const nightshiftInvestigationAttachmentSchema = z.object({
  investigation_id: z.string().min(1),
  /**
   * The same shape the `investigate` step produces and the investigation record persists, so the
   * Canvas renders from it exactly as the investigation flyout does.
   */
  state: investigationStateSchema,
});

export type NightshiftInvestigationAttachmentData = z.infer<
  typeof nightshiftInvestigationAttachmentSchema
>;

export type NightshiftInvestigationAttachment = Attachment<
  typeof NIGHTSHIFT_INVESTIGATION_ATTACHMENT_TYPE,
  NightshiftInvestigationAttachmentData
>;
