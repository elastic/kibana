/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ENHANCEMENTS_DATA_INPUT_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.enhancements.title',
  { defaultMessage: 'Add enhancements (Optional)' }
);

export const ENHANCEMENT_TYPE_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.enhancements.typeLabel',
  { defaultMessage: 'Enhancement type' }
);

export const FILE_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.enhancements.fileLabel',
  { defaultMessage: 'File' }
);

export const FILE_PICKER_PROMPT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.enhancements.filePickerPrompt',
  { defaultMessage: 'Select or drag and drop a JSON file' }
);

export const ADD_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.enhancements.addButton',
  { defaultMessage: 'Add' }
);

export const ADDED_ENHANCEMENTS_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.enhancements.addedLabel',
  { defaultMessage: 'Added:' }
);

export const NO_ENHANCEMENTS_ADDED = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.enhancements.noEnhancementsAdded',
  {
    defaultMessage:
      'No enhancements added yet. You can also start translations without any enhancements',
  }
);

export const INVALID_JSON_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.enhancements.invalidJsonError',
  { defaultMessage: 'Invalid JSON file' }
);

export const UPLOAD_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.enhancements.uploadError',
  { defaultMessage: 'Failed to upload enhancement' }
);

export const ENHANCEMENTS_INSTRUCTIONS = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.enhancements.instructions',
  {
    defaultMessage:
      'You have an option to upload additional data to enhance already uploaded rules. Enhancement are generally part of core rule data but are sometimes available in a separate file. Today with only support MITRE ATT&CK mappings as enhancements.',
  }
);

export const ENHANCEMENTS_HELPER_TEXT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.enhancements.helperText',
  {
    defaultMessage:
      'You will not be able to add enhancements if you close this flyout. Please add enhancement now for better translation results.',
  }
);
