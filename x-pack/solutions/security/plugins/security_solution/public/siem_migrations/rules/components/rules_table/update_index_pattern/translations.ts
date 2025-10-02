/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INDEX_PATTERN_PLACEHOLDER_FORM_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.indexPatternPlaceholderForm.title',
  {
    defaultMessage: 'Update index pattern',
  }
);

export const INDEX_PATTERN_PLACEHOLDER_FORM_CANCEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.indexPatternPlaceholderForm.cancel',
  {
    defaultMessage: 'Cancel',
  }
);

export const INDEX_PATTERN_PLACEHOLDER_FORM_SAVE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.indexPatternPlaceholderForm.save',
  {
    defaultMessage: 'Save',
  }
);

export const INDEX_PATTERN_PLACEHOLDER_FORM_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.indexPatternPlaceholderForm.helpText',
  {
    defaultMessage: 'Select the index pattern to update',
  }
);

export const INDEX_PATTERN_PLACEHOLDER_FORM_INDEX_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.indexPatternPlaceholderForm.indexLabel',
  {
    defaultMessage: 'Index pattern',
  }
);

export const UPDATE_INDEX_PATTERN_OVERWRITE_INDEX_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.updateIndexPatternForm.overwriteIndexLabel',
  {
    defaultMessage: 'Overwrite index pattern',
  }
);

export const UPDATE_INDEX_PATTERN_OVERWRITE_DATA_VIEWS_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.updateIndexPatternForm.overwriteDataViewsLabel',
  {
    defaultMessage: 'Overwrite data views',
  }
);

export const UPDATE_INDEX_PATTERN_REQUIRED_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.updateIndexPatternForm.requiredError',
  {
    defaultMessage: 'Index pattern is required',
  }
);
