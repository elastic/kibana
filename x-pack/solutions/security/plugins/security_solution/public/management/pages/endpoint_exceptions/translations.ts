/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ABOUT_ENDPOINT_EXCEPTIONS = i18n.translate(
  'xpack.securitySolution.endpointExceptions.aboutInfo',
  {
    defaultMessage:
      'Endpoint exceptions prevent generating an alert by Defend integration on the host.',
  }
);

export const NAME_LABEL = i18n.translate(
  'xpack.securitySolution.endpointExceptions.form.name.label',
  { defaultMessage: 'Name' }
);

export const OS_LABEL = i18n.translate('xpack.securitySolution.endpointExceptions.form.os.label', {
  defaultMessage: 'Select operating system',
});

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.securitySolution.endpointExceptions.form.description.placeholder',
  { defaultMessage: 'Description' }
);

export const NAME_ERROR = i18n.translate(
  'xpack.securitySolution.endpointExceptions.form.name.error',
  { defaultMessage: "The name can't be empty" }
);
