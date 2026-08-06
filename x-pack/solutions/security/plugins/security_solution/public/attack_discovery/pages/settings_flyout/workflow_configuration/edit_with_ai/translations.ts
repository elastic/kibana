/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EDIT_WITH_AI = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.editWithAi.editWithAi',
  {
    defaultMessage: 'Edit with AI',
  }
);

export const AGENT_BUILDER_REQUIRED = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.editWithAi.agentBuilderRequired',
  {
    defaultMessage: 'Agent Builder must be enabled to edit with AI',
  }
);

export const UPDATE_ESQL_QUERY_TOOL_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.editWithAi.updateEsqlQueryToolDescription',
  {
    defaultMessage:
      'ALWAYS call this tool to update the ES|QL query in the Attack Discovery settings editor whenever you generate, modify, or suggest a new query. Without calling this tool, the user will not see the updated query in their editor. The query will be applied immediately.',
  }
);

export const UPDATE_ESQL_QUERY_TOOL_DISPLAY_NAME = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.editWithAi.updateEsqlQueryToolDisplayName',
  {
    defaultMessage: 'ES|QL query updated',
  }
);

export const INITIAL_MESSAGE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.editWithAi.initialMessage',
  {
    defaultMessage:
      'Help me improve the attached ES|QL query for Attack Discovery alert retrieval. ',
  }
);

export const ESQL_ATTACHMENT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.editWithAi.esqlAttachmentDescription',
  {
    defaultMessage: 'ES|QL query used for alert retrieval in Attack Discovery',
  }
);
