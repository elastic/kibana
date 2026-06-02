/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { SECURITY_ENDPOINT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { RESPONSE_ACTION_AGENT_TYPE } from '../../endpoint/service/response_actions/constants';

/**
 * Closed union over the domain `ResponseActionAgentType` so typos and unexpected
 * values are rejected at attachment registration time rather than silently
 * persisted.
 */
const AgentTypeSchema = z.enum(RESPONSE_ACTION_AGENT_TYPE);

const EndpointTargetSchema = z
  .object({
    endpointId: z.string(),
    hostname: z.string(),
    agentType: AgentTypeSchema,
  })
  .strict();

const EndpointAttachmentMetadataSchema = z
  .object({
    command: z.string(),
    comment: z.string(),
    targets: z.array(EndpointTargetSchema).min(1, 'targets must contain at least one entry'),
  })
  .strict();

/**
 * Full unified-payload schema for `security.endpoint`. Registered on the unified
 * registry via `schema:` so the cases plugin validates the entire payload (not
 * just the metadata slice). Strict objects reject unknown keys.
 */
export const EndpointAttachmentPayloadSchema = z
  .object({
    type: z.literal(SECURITY_ENDPOINT_ATTACHMENT_TYPE),
    owner: z.string(),
    attachmentId: z.string(),
    metadata: EndpointAttachmentMetadataSchema,
  })
  .strict();

export type EndpointAttachmentPayload = z.infer<typeof EndpointAttachmentPayloadSchema>;
export type EndpointAttachmentMetadata = EndpointAttachmentPayload['metadata'];
export type EndpointAttachmentTarget = EndpointAttachmentMetadata['targets'][number];
