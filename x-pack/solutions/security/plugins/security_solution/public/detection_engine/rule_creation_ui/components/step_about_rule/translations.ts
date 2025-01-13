/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADVANCED_SETTINGS = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.advancedSettingsButton',
  {
    defaultMessage: 'Advanced settings',
  }
);

export const ADD_REFERENCE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.addReferenceDescription',
  {
    defaultMessage: 'Add reference URL',
  }
);

export const ADD_FALSE_POSITIVE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.addFalsePositiveDescription',
  {
    defaultMessage: 'Add false positive example',
  }
);

export const ADD_CUSTOM_HIGHLIGHTED_FIELD = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.addCustomHighlightedFieldDescription',
  {
    defaultMessage: 'Add a custom highlighted field',
  }
);

export const GLOBAL_ENDPOINT_EXCEPTION_LIST = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.endpointExceptionListLabel',
  {
    defaultMessage: 'Elastic Endpoint exceptions',
  }
);

export const BUILDING_BLOCK = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.buildingBlockLabel',
  {
    defaultMessage: 'Building block',
  }
);

export const LOW = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.severityOptionLowDescription',
  {
    defaultMessage: 'Low',
  }
);

export const MEDIUM = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.severityOptionMediumDescription',
  {
    defaultMessage: 'Medium',
  }
);

export const HIGH = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.severityOptionHighDescription',
  {
    defaultMessage: 'High',
  }
);

export const CRITICAL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.severityOptionCriticalDescription',
  {
    defaultMessage: 'Critical',
  }
);

export const URL_FORMAT_INVALID = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.referencesUrlInvalidError',
  {
    defaultMessage: 'URL is invalid format',
  }
);

export const ADD_RULE_NOTE_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutrule.noteHelpText',
  {
    defaultMessage: 'Add rule investigation guide...',
  }
);

export const ADD_RULE_SETUP_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutrule.setupHelpText',
  {
    defaultMessage: 'Add rule setup guide...',
  }
);

export const AUTHOR_IMMUTABLE_FIELD_TOOLTIP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutrule.authorImmutableFieldTooltipText',
  {
    defaultMessage: 'Author is not editable for Elastic rules',
  }
);

export const LICENSE_IMMUTABLE_FIELD_TOOLTIP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutrule.licenseImmutableFieldTooltipText',
  {
    defaultMessage: 'License is not editable for Elastic rules',
  }
);
