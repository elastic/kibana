/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RUNSCRIPT_CONFIG_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.runscriptConfig.runscriptConfigurationLabel',
  { defaultMessage: 'Operating system configuration' }
);
export const RUNSCRIPT_CONFIG_REQUIRES_ONE_OS = i18n.translate(
  'xpack.securitySolution.endpoint.runscriptConfig.runscriptConfigurationHelp',
  { defaultMessage: 'At least one OS script must be configured' }
);
export const SCRIPT_SELECTION_LABEL = i18n.translate(
  'xpack.securitySolution.runscriptConfig.scriptSelectionLabel',
  { defaultMessage: 'Script' }
);
export const SCRIPT_ARGUMENTS_LABEL = i18n.translate(
  'xpack.securitySolution.runscriptConfig.scriptArgumentsLabel',
  { defaultMessage: 'Arguments' }
);
export const SCRIPT_ARGUMENTS_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.runscriptConfig.scriptArgumentsPlaceholder',
  { defaultMessage: 'Enter arguments' }
);
export const SCRIPT_TIMEOUT_LABEL = i18n.translate(
  'xpack.securitySolution.runscriptConfig.scriptTimeoutLabel',
  { defaultMessage: 'Timeout' }
);
export const SCRIPT_TIMEOUT_HELP = i18n.translate(
  'xpack.securitySolution.runscriptConfig.scriptTimeoutValueTip',
  { defaultMessage: 'In seconds' }
);
export const OPTIONAL_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.runscriptConfig.optionalFieldLabel',
  { defaultMessage: 'optional' }
);
export const TIMEOUT_TOOLTIP_CONTENT = i18n.translate(
  'xpack.securitySolution.runscriptConfig.timeoutTooltipContent',
  { defaultMessage: 'Script execution timeout in seconds. Defaults to 4 hours if not specified.' }
);
export const SCRIPT_ARGUMENTS_REQUIRED_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.runscriptConfig.scriptArgumentsRequiredHelpText',
  { defaultMessage: 'Selected script requires arguments to be provided' }
);
export const TIMEOUT_VALUE_MUST_BE_NUMBER = i18n.translate(
  'xpack.securitySolution.runscriptConfig.invalidTimeoutValue',
  {
    defaultMessage: 'Value must be a number',
  }
);
export const TIMEOUT_VALUE_MUST_BE_GREATER_THAN_ZERO = i18n.translate(
  'xpack.securitySolution.runscriptConfig.timeoutMustBeGreaterThanZero',
  {
    defaultMessage: 'Value must be greater than 0',
  }
);
export const SELECTED_SCRIPT_DETAILS_LABEL = i18n.translate(
  'xpack.securitySolution.runscriptConfig.selectedScriptDetailsLabel',
  { defaultMessage: 'Script details' }
);
