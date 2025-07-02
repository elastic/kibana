/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PRIVILEGES_MISSING_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.assistantCard.missingPrivileges.title',
  {
    defaultMessage: 'Missing privileges',
  }
);

export const PRIVILEGES_REQUIRED_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.assistantCard.requiredPrivileges',
  {
    defaultMessage: 'The minimum Kibana privileges required to use this feature are:',
  }
);

export const CONTACT_ADMINISTRATOR = i18n.translate(
  'xpack.securitySolution.onboarding.assistantCard.missingPrivileges.contactAdministrator',
  {
    defaultMessage: 'Contact your administrator for assistance.',
  }
);
