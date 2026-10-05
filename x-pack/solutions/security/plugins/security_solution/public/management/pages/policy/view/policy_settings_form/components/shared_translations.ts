/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Shared translations for policy settings form components across different protection types
 */

export const NOTIFY_USER_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policyDetailsConfig.userNotification',
  { defaultMessage: 'User notification' }
);

export const NOTIFY_USER_CHECKBOX_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policyDetail.notifyUser',
  {
    defaultMessage: 'Notify user',
  }
);

export const NOTIFICATION_MESSAGE_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policyDetailsConfig.notificationMessage',
  {
    defaultMessage: 'Notification message',
  }
);

export const CUSTOMIZE_NOTIFICATION_MESSAGE_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policyDetailsConfig.customizeUserNotification',
  {
    defaultMessage: 'Customize notification message',
  }
);

export const CUSTOM_YARA_SIGNATURES_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.protections.customYaraSignaturesLabel',
  {
    defaultMessage: 'Apply custom YARA signatures',
  }
);

export const CUSTOM_YARA_SIGNATURES_HINT = i18n.translate(
  'xpack.securitySolution.endpoint.policyDetailsConfig.customYaraSignaturesTooltip',
  {
    defaultMessage:
      'Endpoints enabled with this policy will apply custom YARA signatures from the custom YARA signatures page.',
  }
);

export const CUSTOM_YARA_SIGNATURES_LICENSE_UPSELL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.protections.customYaraSignaturesLicenseTooltip',
  {
    defaultMessage: 'Custom YARA signatures require an Enterprise license.',
  }
);
