/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SKILL_RETRIEVAL_TOGGLE_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.skillRetrievalToggleLabel',
  {
    defaultMessage: 'Attack discovery skill retrieves alerts',
  }
);

export const SKILL_RETRIEVAL_TOGGLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.skillRetrievalToggleTooltip',
  {
    defaultMessage:
      'When enabled, the Attack Discovery skill retrieves and curates additional relevant alerts on top of any alerts collected by the other retrieval methods.',
  }
);

export const ALERT_RETRIEVAL_WORKFLOWS_TOGGLE_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.alertRetrievalWorkflowsToggleLabel',
  {
    defaultMessage: 'Alert retrieval workflows',
  }
);

export const ALERT_RETRIEVAL_WORKFLOWS_INFO_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.alertRetrievalWorkflowsInfoAriaLabel',
  {
    defaultMessage: 'More information about alert retrieval workflows',
  }
);

export const ALERT_RETRIEVAL_WORKFLOWS_POPOVER_HEADLINE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.alertRetrievalWorkflowsPopoverHeadline',
  {
    defaultMessage: 'Run your own workflows to retrieve and enrich alerts for Attack Discovery',
  }
);

export const ALERT_RETRIEVAL_WORKFLOWS_POPOVER_DETAIL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.alertRetrievalWorkflowsPopoverDetail',
  {
    defaultMessage:
      'The last step in the workflow that produces output returns the alerts: an ES|QL result (its columns and values) is converted to one alert per row, an array of strings is used as-is, and any other object is encoded as JSON.',
  }
);

export const ALERT_RETRIEVAL_WORKFLOWS_EXAMPLE_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.alertRetrievalWorkflowsExampleLabel',
  {
    defaultMessage: 'Example workflow',
  }
);

export const ALERT_RETRIEVAL_WORKFLOWS_COPY_BUTTON = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.alertRetrievalWorkflowsCopyButton',
  {
    defaultMessage: 'Copy',
  }
);

export const ALERT_RETRIEVAL_WORKFLOWS_CLOSE_BUTTON = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.alertRetrievalWorkflowsCloseButton',
  {
    defaultMessage: 'Close',
  }
);

export const DEFAULT_ALERT_RETRIEVAL_TOGGLE_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.defaultAlertRetrievalToggleLabel',
  {
    defaultMessage: 'ES|QL or custom query',
  }
);

export const DEFAULT_ALERT_RETRIEVAL_TOGGLE_HELP = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.defaultAlertRetrievalToggleHelp',
  {
    defaultMessage:
      'Use the built-in alert retrieval workflow with customizable queries, date ranges, and alert limits',
  }
);

export const DEFAULT_ALERT_RETRIEVAL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.defaultAlertRetrievalTooltip',
  {
    defaultMessage: 'Retrieves alerts with an ES|QL or custom query',
  }
);

export const ALERT_RETRIEVAL_WORKFLOWS_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.alertRetrievalWorkflowsLabel',
  {
    defaultMessage: 'Alert retrieval workflows',
  }
);

export const getAlertRetrievalWorkflowsLabel = (count: number): string =>
  count >= 1
    ? i18n.translate(
        'xpack.securitySolution.attackDiscovery.workflowConfiguration.alertRetrievalWorkflowsLabelWithCount',
        {
          defaultMessage: 'Alert retrieval workflows ({count})',
          values: { count },
        }
      )
    : ALERT_RETRIEVAL_WORKFLOWS_LABEL;

export const ALERT_RETRIEVAL_WORKFLOWS_HELP = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.alertRetrievalWorkflowsHelp',
  {
    defaultMessage: 'Select one or more workflows that retrieve and enrich alerts.',
  }
);

export const ALERT_RETRIEVAL_WORKFLOWS_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.alertRetrievalWorkflowsPlaceholder',
  {
    defaultMessage: 'Select alert retrieval workflows',
  }
);

export const VALIDATION_WORKFLOW_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.validationWorkflowLabel',
  {
    defaultMessage: 'Validation workflow',
  }
);

export const VALIDATION_WORKFLOW_HELP = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.validationWorkflowHelp',
  {
    defaultMessage: 'Validate, enrich, or filter findings before saving them as Attacks.',
  }
);

export const VALIDATION_WORKFLOW_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.validationWorkflowPlaceholder',
  {
    defaultMessage: 'Select validation workflow',
  }
);

export const DEFAULT_VALIDATION_WORKFLOW_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.defaultValidationWorkflowLabel',
  {
    defaultMessage: 'Default Validation Workflow',
  }
);

export const DEFAULT_VALIDATION_WORKFLOW_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.defaultValidationWorkflowDescription',
  {
    defaultMessage: 'Use the built-in default validation workflow',
  }
);

export const DEFAULT_BADGE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.defaultBadge',
  {
    defaultMessage: 'Default',
  }
);

export const DISABLED_SUFFIX = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.disabledSuffix',
  {
    defaultMessage: '(disabled)',
  }
);

export const RECOMMENDED_SUFFIX = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.recommendedSuffix',
  {
    defaultMessage: '(recommended)',
  }
);

export const WORKFLOW_PICKER_EMPTY_MESSAGE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.workflowPickerEmptyMessage',
  {
    defaultMessage: 'No workflows available',
  }
);

export const WORKFLOW_PICKER_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.workflowPickerAriaLabel',
  {
    defaultMessage: 'Workflow selection',
  }
);

export const AT_LEAST_ONE_ALERT_RETRIEVAL_METHOD_REQUIRED = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.atLeastOneAlertRetrievalMethodRequired',
  {
    defaultMessage: 'At least one alert retrieval method must be enabled',
  }
);

export const DEFAULT_ALERT_RETRIEVAL_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.defaultAlertRetrievalSectionTitle',
  {
    defaultMessage: 'Default alert retrieval settings',
  }
);

export const NO_ALERT_RETRIEVAL_METHOD_SELECTED = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.noAlertRetrievalMethodSelected',
  {
    defaultMessage: 'At least one alert retrieval method must be enabled',
  }
);

export const NO_ALERT_RETRIEVAL_WORKFLOWS_SELECTED = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.noAlertRetrievalWorkflowsSelected',
  {
    defaultMessage: 'Select at least one alert retrieval workflow',
  }
);

export const NO_VALIDATION_WORKFLOW_SELECTED = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.noValidationWorkflowSelected',
  {
    defaultMessage: 'A validation workflow must be selected',
  }
);

export const VALIDATION_ERRORS_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.validationErrorsTitle',
  {
    defaultMessage: 'Please fix the following issues to continue:',
  }
);

export const PIPELINE_STAGE_ALERT_RETRIEVAL_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.pipelineStageAlertRetrievalLabel',
  {
    defaultMessage: 'Alert Retrieval',
  }
);

export const PIPELINE_STAGE_GENERATION_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.pipelineStageGenerationLabel',
  {
    defaultMessage: 'Generation',
  }
);

export const PIPELINE_STAGE_VALIDATION_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.pipelineStageValidationLabel',
  {
    defaultMessage: 'Validation',
  }
);

export const NO_CUSTOM_WORKFLOWS_AVAILABLE_MESSAGE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.noCustomWorkflowsAvailableMessage',
  {
    defaultMessage: 'No custom workflows available.',
  }
);

export const CREATE_A_WORKFLOW_LINK_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.createAWorkflowLinkLabel',
  {
    defaultMessage: 'Create a workflow',
  }
);

export const ALERT_RETRIEVAL_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.alertRetrievalSectionTitle',
  {
    defaultMessage: 'Alert retrieval method',
  }
);

export const ALERT_RETRIEVAL_SECTION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.alertRetrievalSectionDescription',
  {
    defaultMessage: 'Choose how alerts are collected',
  }
);

export const VALIDATION_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.validationSectionTitle',
  {
    defaultMessage: 'Validation',
  }
);

export const GENERATION_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.generationSectionTitle',
  {
    defaultMessage: 'Generation',
  }
);

export const NOTIFICATIONS_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.notificationsSectionTitle',
  {
    defaultMessage: 'Notifications',
  }
);

export const NOTIFICATIONS_SECTION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.notificationsSectionDescription',
  {
    defaultMessage:
      'Send notifications on a schedule using connectors (Email, Slack, Jira, and more).',
  }
);

export const GENERATION_SECTION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.generationSectionDescription',
  {
    defaultMessage: 'Configure how Attack Discovery generates findings from retrieved alerts.',
  }
);

export const NEW_WORKFLOW = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.newWorkflow',
  {
    defaultMessage: 'New workflow',
  }
);

export const CREATE_NEW_WORKFLOW = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.createNewWorkflow',
  {
    defaultMessage: 'Create a new workflow',
  }
);

export const VIEW_EXAMPLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.viewExample',
  {
    defaultMessage: 'View example',
  }
);

export const CANCEL_GENERATION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.cancelGeneration',
  {
    defaultMessage: 'Cancel generation',
  }
);

export const RETRIEVAL_MODE_SELECTOR_LEGEND = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.retrievalModeSelectorLegend',
  {
    defaultMessage: 'Alert retrieval mode',
  }
);

export const RETRIEVAL_MODE_SKILL_OPTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.retrievalModeSkillOption',
  {
    defaultMessage: 'Skill',
  }
);

export const RETRIEVAL_MODE_ADVANCED_OPTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.retrievalModeAdvancedOption',
  {
    defaultMessage: 'Advanced',
  }
);

export const SKILL_RETRIEVAL_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.skillRetrievalDescription',
  {
    defaultMessage:
      'The Attack Discovery skill automatically retrieves and curates the most relevant alerts. Use the advanced options to override retrieval with a custom query, ES|QL, or custom workflows.',
  }
);

export const RETRIEVAL_METHOD_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.retrievalMethodLabel',
  {
    defaultMessage: 'Retrieval method:',
  }
);

export const BUILT_IN_LEGACY = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.builtInDefault',
  {
    defaultMessage: 'Built-in (legacy)',
  }
);

export const WORKFLOWS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.workflows',
  {
    defaultMessage: 'Workflows',
  }
);

export const QUERY_MODE_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.queryModeLabel',
  {
    defaultMessage: 'Query mode',
  }
);

export const QUERY_BUILDER_MODE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.queryBuilderMode',
  {
    defaultMessage: 'Query builder mode',
  }
);

export const ESQL_MODE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.esqlMode',
  {
    defaultMessage: 'ES|QL mode',
  }
);

export const CUSTOM_QUERY = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.customQuery',
  {
    defaultMessage: 'Custom query',
  }
);

export const ESQL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.esql',
  {
    defaultMessage: 'ES|QL',
  }
);

export const ALERT_RETRIEVAL_WORKFLOW_NOT_FOUND = (workflowId: string): string =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.workflowConfiguration.alertRetrievalWorkflowNotFound',
    {
      defaultMessage: 'Alert retrieval workflow "{workflowId}" was not found',
      values: { workflowId },
    }
  );

export const ALERT_RETRIEVAL_WORKFLOW_DISABLED = (workflowName: string): string =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.workflowConfiguration.alertRetrievalWorkflowDisabled',
    {
      defaultMessage: 'Alert retrieval workflow "{workflowName}" is disabled',
      values: { workflowName },
    }
  );

export const VALIDATION_WORKFLOW_NOT_FOUND = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.validationWorkflowNotFound',
  {
    defaultMessage: 'The selected validation workflow was not found',
  }
);

export const VALIDATION_WORKFLOW_DISABLED = (workflowName: string): string =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.workflowConfiguration.validationWorkflowDisabled',
    {
      defaultMessage: 'Validation workflow "{workflowName}" is disabled',
      values: { workflowName },
    }
  );

export const VALIDATION_WARNINGS_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowConfiguration.validationWarningsTitle',
  {
    defaultMessage: 'The following issues may affect execution:',
  }
);
