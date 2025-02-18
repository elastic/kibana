/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SPLUNK_QUERY_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.splunkQuery.title',
  {
    defaultMessage: 'Splunk query',
  }
);

export const SPLUNK_QUERY_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.splunkQuery.tooltip',
  {
    defaultMessage: 'This is the rule name detected in the export file uploaded for translation',
  }
);

export const TRANSLATION_QUERY_TITLE = (queryLanguage: string) => {
  return i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.translationQuery.title',
    {
      defaultMessage: '{queryLanguage} query',
      values: { queryLanguage },
    }
  );
};

export const TRANSLATION_QUERY_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.translationQuery.queryPlaceholder',
  {
    defaultMessage: 'This rule has not been translated. Click edit to start writing.',
  }
);

export const TRANSLATION_QUERY_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.machineLearningRule.tooltip',
  {
    defaultMessage:
      'Elastic prebuilt rules use EQL, ES|QL, KQL or Lucene. AI-translated rules use ES|QL.',
  }
);

export const MACHINE_LEARNING_RULE_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.machineLearningRule.title',
  {
    defaultMessage: 'Machine learning rule',
  }
);

export const MACHINE_LEARNING_RULE_QUERY_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.machineLearningRule.queryPlaceholder',
  {
    defaultMessage:
      'This query was mapped to a Machine Learning rule. See more details in the Overview tab above.',
  }
);

export const MACHINE_LEARNING_RULE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.machineLearningRule.tooltip',
  {
    defaultMessage: 'Machine learning rules may require additional configuration.',
  }
);

export const EDIT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.editButtonLabel',
  {
    defaultMessage: 'Edit',
  }
);

export const SAVE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.saveButtonLabel',
  {
    defaultMessage: 'Save',
  }
);

export const CANCEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.cancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);
