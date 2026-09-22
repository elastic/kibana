/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ExceptionItemBaseInput } from '@kbn/securitysolution-exceptions-common/workflows';
import type { SecurityAgentBuilderAttachments } from '../../../../common/constants';

export type ExceptionAttachmentData = ExceptionItemBaseInput & { attachmentLabel?: string };

export type ExceptionAttachment = Attachment<
  SecurityAgentBuilderAttachments.exception,
  ExceptionAttachmentData
>;
