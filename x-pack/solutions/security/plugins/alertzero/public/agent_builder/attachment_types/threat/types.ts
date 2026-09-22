/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { threatAttachmentDataSchema } from '../../../../common/threat_attachment_schema';
import type { ThreatAttachmentData } from '../../../../common/threat_attachment_schema';

export type { ThreatAttachmentData } from '../../../../common/threat_attachment_schema';

export type ThreatAttachment = Attachment<string, ThreatAttachmentData>;

/**
 * Structural check for the fields the renderer actually reads: requires a non-empty
 * `report_id`, since that is the only field the live fetch needs. Deliberately permissive
 * on the optional captured fields (old/malformed attachments should still render with
 * whatever fallback data is usable); `.safeParse` accepts a payload missing those.
 */
export const isValidThreatAttachmentData = (
  candidate: unknown
): candidate is ThreatAttachmentData => threatAttachmentDataSchema.safeParse(candidate).success;
