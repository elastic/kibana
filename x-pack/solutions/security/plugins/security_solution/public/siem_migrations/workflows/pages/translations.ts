/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.pageTitle',
  {
    defaultMessage: 'Translated workflows',
  }
);

export const TRANSLATED_WORKFLOWS_EMPTY_PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.emptyPageTitle',
  {
    defaultMessage: 'No translated workflows yet',
  }
);

export const TRANSLATED_WORKFLOWS_EMPTY_PAGE_MESSAGE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.emptyPageMessage',
  {
    defaultMessage:
      'Upload Tines stories from the Automatic Migrations onboarding to start translating workflows.',
  }
);

export const TRANSLATED_WORKFLOWS_EMPTY_PAGE_CTA = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.emptyPageCta',
  {
    defaultMessage: 'Start migration',
  }
);

export const PAGE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.pageDescription',
  {
    defaultMessage:
      'Translate Tines stories to Elastic Workflows, save them here, and run them. Uploads are tagged as tines-migration for this list.',
  }
);

export const UPLOAD_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.upload.description',
  {
    defaultMessage: 'Upload a Tines story export JSON file exported from Tines.',
  }
);

export const UPLOAD_PROMPT = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.upload.prompt',
  {
    defaultMessage: 'Select or drag and drop a Tines story JSON file',
  }
);

export const UPLOAD_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.upload.ariaLabel',
  {
    defaultMessage: 'Upload Tines story JSON file',
  }
);

export const TRANSLATE_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.translateButton',
  {
    defaultMessage: 'Translate',
  }
);

export const YAML_PREVIEW_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.yamlPreviewTitle',
  {
    defaultMessage: 'Workflow YAML',
  }
);

export const COPY_YAML = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.copyYaml',
  {
    defaultMessage: 'Copy YAML',
  }
);

export const DOWNLOAD_YAML = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.downloadYaml',
  {
    defaultMessage: 'Download YAML',
  }
);

export const REPORT_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.reportTitle',
  {
    defaultMessage: 'Migration report',
  }
);

export const MAPPED_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.mappedTitle',
  {
    defaultMessage: 'Mapped agents',
  }
);

export const SKIPPED_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.skippedTitle',
  {
    defaultMessage: 'Skipped agents',
  }
);

export const WARNINGS_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.warningsTitle',
  {
    defaultMessage: 'Warnings',
  }
);

export const VALIDATION_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.validationSuccess',
  {
    defaultMessage: 'Workflow YAML validated successfully against WorkflowSchema.',
  }
);

export const VALIDATION_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.validationFailure',
  {
    defaultMessage: 'Workflow YAML failed schema validation.',
  }
);

export const COLUMN_AGENT_NAME = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.columns.agentName',
  {
    defaultMessage: 'Agent name',
  }
);

export const COLUMN_AGENT_TYPE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.columns.agentType',
  {
    defaultMessage: 'Agent type',
  }
);

export const COLUMN_STEP_NAME = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.columns.stepName',
  {
    defaultMessage: 'Step name',
  }
);

export const COLUMN_ELASTIC_TYPE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.columns.elasticType',
  {
    defaultMessage: 'Elastic type',
  }
);

export const COLUMN_REASON = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.columns.reason',
  {
    defaultMessage: 'Reason',
  }
);

export const TRANSLATE_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.translateError',
  {
    defaultMessage: 'Failed to translate Tines story',
  }
);

export const SAVE_TO_WORKFLOWS = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.saveToWorkflows',
  {
    defaultMessage: 'Save to Workflows',
  }
);

export const SAVE_AND_RUN = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.saveAndRun',
  {
    defaultMessage: 'Save and run',
  }
);

export const OPEN_IN_WORKFLOWS = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.openInWorkflows',
  {
    defaultMessage: 'Open in Workflows',
  }
);

export const RUN_WORKFLOW = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.runWorkflow',
  {
    defaultMessage: 'Run',
  }
);

export const SAVE_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.saveSuccess',
  {
    defaultMessage: 'Workflow saved to Workflows',
  }
);

export const SAVE_AND_RUN_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.saveAndRunSuccess',
  {
    defaultMessage: 'Workflow saved and started',
  }
);

export const RUN_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.runSuccess',
  {
    defaultMessage: 'Workflow started',
  }
);

export const SAVE_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.saveError',
  {
    defaultMessage: 'Failed to save workflow',
  }
);

export const RUN_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.runError',
  {
    defaultMessage: 'Failed to run workflow',
  }
);

export const MISSING_WORKFLOWS_PRIVILEGES = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.missingPrivileges',
  {
    defaultMessage:
      'You need Workflows create and execute privileges to save or run translated workflows. You can still copy or download the YAML.',
  }
);

export const CONNECTOR_PLACEHOLDER_WARNING = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.connectorPlaceholderWarning',
  {
    defaultMessage:
      'This workflow may include connector ID placeholders. Replace them in the Workflows editor before expecting connector steps to succeed.',
  }
);

export const CONNECTOR_TYPE_EMAIL = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.connectorType.email',
  {
    defaultMessage: 'Email',
  }
);

export const CONNECTOR_TYPE_SLACK = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.connectorType.slack',
  {
    defaultMessage: 'Slack',
  }
);

export const CONNECTOR_SELECT_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.connectorSelectPlaceholder',
  {
    defaultMessage: 'Select a connector…',
  }
);

export const REQUIRED_CONNECTORS_TITLE = (configured: number, total: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.workflows.requiredConnectorsTitle', {
    defaultMessage: 'Required connectors ({configured}/{total})',
    values: { configured, total },
  });

export const REQUIRED_CONNECTORS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.requiredConnectorsDescription',
  {
    defaultMessage:
      'This translated workflow needs Actions connectors. Select an existing connector or create one, then refresh the list.',
  }
);

export const REQUIRED_CONNECTOR_ROW_LABEL = (
  connectorType: string,
  configured: number,
  total: number,
  stepCount: number
) =>
  i18n.translate('xpack.securitySolution.siemMigrations.workflows.requiredConnectorRowLabel', {
    defaultMessage:
      '{connectorType} ({configured}/{total}) — used by {stepCount, plural, one {# step} other {# steps}}',
    values: { connectorType, configured, total, stepCount },
  });

export const REQUIRED_CONNECTOR_NONE_HELP = (connectorType: string) =>
  i18n.translate('xpack.securitySolution.siemMigrations.workflows.requiredConnectorNoneHelp', {
    defaultMessage:
      'No {connectorType} connector found. Create one in Stack Management, then refresh.',
    values: { connectorType },
  });

export const REQUIRED_CONNECTOR_SELECT_ARIA = (connectorType: string) =>
  i18n.translate('xpack.securitySolution.siemMigrations.workflows.requiredConnectorSelectAria', {
    defaultMessage: 'Select {connectorType} connector',
    values: { connectorType },
  });

export const CREATE_CONNECTOR_GENERIC = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.createConnectorGeneric',
  {
    defaultMessage: 'Create connector',
  }
);

export const REFRESH_CONNECTORS = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.refreshConnectors',
  {
    defaultMessage: 'Refresh',
  }
);

export const REQUIRED_CONNECTORS_SOFT_WARNING = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.requiredConnectorsSoftWarning',
  {
    defaultMessage:
      'You can still save with unresolved placeholders and finish setup in the Workflows editor.',
  }
);

export const LIST_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.listTitle',
  {
    defaultMessage: 'Saved translations',
  }
);

export const REFRESH_LIST = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.refreshList',
  {
    defaultMessage: 'Refresh',
  }
);

export const LIST_EMPTY = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.listEmpty',
  {
    defaultMessage: 'No translated workflows saved yet. Translate a Tines story and save it.',
  }
);

export const LIST_LOAD_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.listLoadError',
  {
    defaultMessage: 'Failed to load translated workflows',
  }
);

export const COLUMN_NAME = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.columns.name',
  {
    defaultMessage: 'Name',
  }
);

export const COLUMN_ENABLED = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.columns.enabled',
  {
    defaultMessage: 'Enabled',
  }
);

export const COLUMN_VALID = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.columns.valid',
  {
    defaultMessage: 'Valid',
  }
);

export const COLUMN_ACTIONS = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.columns.actions',
  {
    defaultMessage: 'Actions',
  }
);

export const NEW_TRANSLATION_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.newTranslationTitle',
  {
    defaultMessage: 'New translation',
  }
);

export const YES = i18n.translate('xpack.securitySolution.siemMigrations.workflows.yes', {
  defaultMessage: 'Yes',
});

export const NO = i18n.translate('xpack.securitySolution.siemMigrations.workflows.no', {
  defaultMessage: 'No',
});

