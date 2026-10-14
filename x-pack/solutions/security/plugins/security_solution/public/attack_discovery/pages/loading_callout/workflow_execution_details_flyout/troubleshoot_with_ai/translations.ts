/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AGENT_BUILDER_REQUIRED = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowExecutionDetailsFlyout.troubleshootWithAi.agentBuilderRequired',
  {
    defaultMessage: 'Agent Builder must be enabled to troubleshoot with AI',
  }
);

export const INITIAL_MESSAGE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowExecutionDetailsFlyout.troubleshootWithAi.initialMessage',
  {
    defaultMessage:
      'Help me troubleshoot this Attack Discovery workflow execution that did not complete successfully.',
  }
);

export const TROUBLESHOOT_ATTACHMENT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowExecutionDetailsFlyout.troubleshootWithAi.troubleshootAttachmentDescription',
  {
    defaultMessage: 'Attack Discovery workflow execution metadata for troubleshooting',
  }
);

export const TROUBLESHOOT_WITH_AI = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowExecutionDetailsFlyout.troubleshootWithAi.troubleshootWithAi',
  {
    defaultMessage: 'Troubleshoot with AI',
  }
);
