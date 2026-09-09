/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ExceptionItemBaseInput } from '@kbn/securitysolution-exceptions-common/workflows';
import type { SecurityAgentBuilderAttachments } from '../../../../common/constants';

/**
 * Payload of a `security.exception` attachment: the exception item fields the
 * `security.createRuleException` step accepts, plus the shared label override.
 * Kept structurally identical to the server's `exceptionAttachmentDataSchema`
 * by deriving both from `exceptionItemBaseSchema`.
 */
export type ExceptionAttachmentData = ExceptionItemBaseInput & { attachmentLabel?: string };

export type ExceptionAttachment = Attachment<
  SecurityAgentBuilderAttachments.exception,
  ExceptionAttachmentData
>;
