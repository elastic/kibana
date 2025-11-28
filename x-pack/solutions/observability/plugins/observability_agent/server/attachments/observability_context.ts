/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import {
  OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
} from '../../common/constants';
import { OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID } from '../tools/get_data_sources/get_data_sources';
import { OBSERVABILITY_GET_ALERTS_TOOL_ID } from '../tools/get_alerts/get_alerts';
import { OBSERVABILITY_SEARCH_KNOWLEDGE_BASE_TOOL_ID } from '../tools/search_knowledge_base/search_knowledge_base';

/**
 * Observability-wide context attachment.
 * Acts as a bridge to expose tools until more specific attachments exist.
 */
import { OBSERVABILITY_TOOL_IDS } from '../tools/register_tools';
export const OBSERVABILITY_CONTEXT_ATTACHMENT_ID = 'observability.observability_context';
export function createObservabilityContextAttachment(): AttachmentTypeDefinition {
  return {
    id: OBSERVABILITY_CONTEXT_ATTACHMENT_ID,
    validate: async () => {
      return { valid: true, data: { mode: 'inline' } };
    },
    format: () => {
      return {
        getRepresentation: async () => ({
          type: 'text',
          value: 'Observability tools for answering questions about Observability data.',
        }),
      };
    },
    getTools: () => [...OBSERVABILITY_TOOL_IDS],
    getAgentDescription: () =>
      'Observability context providing tools for answering questions about Observability data.',
  };
}
