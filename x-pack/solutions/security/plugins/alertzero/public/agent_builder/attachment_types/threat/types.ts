/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { threatAttachmentDataSchema } from '../../../../common/threat_attachment_schema';
import type { ThreatAttachmentData } from '../../../../common/threat_attachment_schema';

export type ThreatAttachment = Attachment<string, ThreatAttachmentData>;

/** The one field the live fetch and the Discover exit need; the rest are display fallbacks. */
export type ThreatAttachmentReference = Pick<ThreatAttachmentData, 'report_id'>;

const threatAttachmentReferenceSchema = threatAttachmentDataSchema.pick({ report_id: true });

/**
 * Structural check for the fields the renderer actually reads: requires a non-empty
 * `report_id`, since that is the only field the live fetch needs.
 *
 * Validates the reference alone rather than the whole schema. A persisted attachment can carry
 * captured fields this build no longer accepts — a `severity` predating an enum change, say —
 * and parsing those here would report the whole reference as invalid, so a report that is
 * perfectly fetchable would render as "No threat report reference available". Callers narrow
 * the optional captured fields individually at the point they display them.
 */
export const isValidThreatAttachmentData = (
  candidate: unknown
): candidate is ThreatAttachmentReference =>
  threatAttachmentReferenceSchema.safeParse(candidate).success;
