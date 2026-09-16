/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FORM_TITLE = i18n.translate(
  'xpack.securitySolution.customYaraSignatures.form.createTitle',
  {
    defaultMessage: 'Details',
  }
);

export const DETAILS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.customYaraSignatures.form.detailsDescription',
  {
    defaultMessage:
      'Provide a clear name and description for your YARA signature to help you and your team identify its purpose and intent.',
  }
);

export const NAME_LABEL = i18n.translate(
  'xpack.securitySolution.customYaraSignatures.form.nameLabel',
  {
    defaultMessage: 'Name',
  }
);

export const NAME_ERROR = i18n.translate(
  'xpack.securitySolution.customYaraSignatures.form.nameErrorMessage',
  {
    defaultMessage: "The name can't be empty",
  }
);

export const OS_LABEL = i18n.translate('xpack.securitySolution.customYaraSignatures.form.osLabel', {
  defaultMessage: 'Operating system',
});

export const OS_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.customYaraSignatures.form.osPlaceholder',
  {
    defaultMessage: 'Select operating systems',
  }
);

export const OS_ERROR = i18n.translate(
  'xpack.securitySolution.customYaraSignatures.form.osErrorMessage',
  {
    defaultMessage: 'Select at least one operating system',
  }
);

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.securitySolution.customYaraSignatures.form.descriptionLabel',
  {
    defaultMessage: 'Description',
  }
);

export const OPTIONAL_LABEL = i18n.translate(
  'xpack.securitySolution.customYaraSignatures.form.optionalLabel',
  {
    defaultMessage: 'optional',
  }
);
