/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import type {
  ImpactAttachmentData,
  ImpactedEntity,
  ImpactVerdictCounts,
} from '../../../../common/agent_builder/impact_attachment';

export type { ImpactAttachmentData, ImpactedEntity, ImpactVerdictCounts };
export { MAX_IMPACTED_ENTITIES } from '../../../../common/agent_builder/impact_attachment';

export type ImpactAttachment = Attachment<
  typeof SecurityAgentBuilderAttachments.impact,
  ImpactAttachmentData
>;
