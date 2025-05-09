/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const IMPORT_RULE_BTN_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.importRuleModal.importRuleTitle',
  {
    defaultMessage: 'Import',
  }
);

export const SELECT_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.importRuleModal.selectRuleDescription',
  {
    defaultMessage:
      'Select rules to import. Associated rule actions and exceptions can be included.',
  }
);

export const INITIAL_PROMPT_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.importRuleModal.initialPromptTextDescription',
  {
    defaultMessage: 'Select or drag and drop a valid rules_export.ndjson file',
  }
);

export const OVERWRITE_WITH_SAME_NAME = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.importRuleModal.overwriteDescription',
  {
    defaultMessage: 'Overwrite existing detection rules with conflicting "rule_id"',
  }
);

export const OVERWRITE_EXCEPTIONS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.importRuleModal.overwriteExceptionLabel',
  {
    defaultMessage: 'Overwrite existing exception lists with conflicting "list_id"',
  }
);

export const OVERWRITE_ACTION_CONNECTORS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.importRuleModal.overwriteActionConnectorsLabel',
  {
    defaultMessage: 'Overwrite existing connectors with conflicting action "id"',
  }
);

export const SUCCESSFULLY_IMPORTED_RULES = (totalRules: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.components.importRuleModal.successfullyImportedRulesTitle',
    {
      values: { totalRules },
      defaultMessage:
        'Successfully imported {totalRules} {totalRules, plural, =1 {rule} other {rules}}',
    }
  );

export const SUCCESSFULLY_IMPORTED_EXCEPTIONS = (totalExceptions: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.components.importRuleModal.exceptionsSuccessLabel',
    {
      values: { totalExceptions },
      defaultMessage:
        'Successfully imported {totalExceptions} {totalExceptions, plural, =1 {exception} other {exceptions}}',
    }
  );

export const SUCCESSFULLY_IMPORTED_CONNECTORS = (totalConnectors: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.components.importRuleModal.connectorsSuccessLabel',
    {
      values: { totalConnectors },
      defaultMessage:
        'Successfully imported {totalConnectors} {totalConnectors, plural, =1 {connector} other {connectors}}',
    }
  );

export const RULE_IMPORT_FAILED = (totalRules: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.components.importRuleModal.importFailedTitle',
    {
      values: { totalRules },
      defaultMessage: 'Failed to import {totalRules} {totalRules, plural, =1 {rule} other {rules}}',
    }
  );

export const CONNECTOR_IMPORT_FAILED = (totalConnectors: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.components.importRuleModal.importConnectorsFailedLabel',
    {
      values: { totalConnectors },
      defaultMessage:
        'Failed to import {totalConnectors, plural, =0 {connectors} =1 {# connector} other {# connectors}}',
    }
  );

export const EXCEPTION_IMPORT_FAILED = (totalExceptions: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.components.importRuleModal.importExceptionsFailedLabel',
    {
      values: { totalExceptions },
      defaultMessage:
        'Failed to import {totalExceptions} {totalExceptions, plural, =1 {exception} other {exceptions}}',
    }
  );

export const ACTION_CONNECTORS_WARNING_TITLE = (totalConnectors: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.components.importRuleModal.actionConnectorsWarningTitle',
    {
      values: { totalConnectors },
      defaultMessage:
        '{totalConnectors} {totalConnectors, plural, =1 {connector} other {connectors}} imported',
    }
  );

export const ACTION_CONNECTORS_WARNING_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.importRuleModal.actionConnectorsWarningButton',
  {
    defaultMessage: 'Go to connectors',
  }
);

export const ACTION_CONNECTORS_ADDITIONAL_PRIVILEGES = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.importRuleModal.actionConnectorsAdditionalPrivilegesError',
  {
    defaultMessage: 'You need additional privileges to import rules with actions.',
  }
);

export const MULTIPLE_ISSUES = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.importRuleModal.multipleIssuesError',
  {
    defaultMessage: 'Multiple issues. See the full error for details.',
  }
);
