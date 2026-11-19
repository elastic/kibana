/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CANCEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.generateWorkflowModal.cancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const DESCRIBE_YOUR_WORKFLOW = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.generateWorkflowModal.describeYourWorkflow',
  {
    defaultMessage: 'Describe your workflow',
  }
);

export const GENERATE_WORKFLOW = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.generateWorkflowModal.generateWorkflowButton',
  {
    defaultMessage: 'Generate workflow',
  }
);

export const GENERATE_WORKFLOW_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.generateWorkflowModal.title',
  {
    defaultMessage: 'Generate workflow',
  }
);

export const MODEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.generateWorkflowModal.model',
  {
    defaultMessage: 'Model',
  }
);

export const WORKFLOW_DESCRIPTION_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.generateWorkflowModal.workflowDescriptionPlaceholder',
  {
    defaultMessage:
      'Describe the workflow you want to generate. For example: "Retrieve alerts from the last 24 hours and enrich them with threat intelligence data."',
  }
);
