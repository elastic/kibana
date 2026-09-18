/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ValidateCustomYaraSignatureDiagnostic } from '../../../../../../common/api/endpoint/custom_yara_signatures';

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

export const DEFINITION_TITLE = i18n.translate(
  'xpack.securitySolution.customYaraSignatures.form.definitionTitle',
  {
    defaultMessage: 'Definition',
  }
);

export const DEFINITION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.customYaraSignatures.form.definitionDescription',
  {
    defaultMessage:
      'Enter your YARA signature code here. You can write or paste one or more YARA signatures, and the system will validate its syntax before saving.',
  }
);

export const SIGNATURE_EDITOR_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.customYaraSignatures.form.signatureEditorAriaLabel',
  {
    defaultMessage: 'YARA signature code',
  }
);

export const VALIDATION_REQUEST_ERROR = i18n.translate(
  'xpack.securitySolution.customYaraSignatures.form.validationRequestErrorMessage',
  {
    defaultMessage: 'Unable to validate YARA signature.',
  }
);

/** User-facing validation diagnostic, including a severity prefix for assistive technology. */
export const getValidationDiagnosticMessage = ({
  line,
  message,
  severity,
}: ValidateCustomYaraSignatureDiagnostic): string => {
  if (line > 0) {
    return i18n.translate(
      'xpack.securitySolution.customYaraSignatures.form.validationDiagnosticWithLineMessage',
      {
        defaultMessage:
          '{severity, select, error {Error on line {line}: {message}} other {Warning on line {line}: {message}}}',
        values: { severity, line, message },
      }
    );
  }

  return i18n.translate(
    'xpack.securitySolution.customYaraSignatures.form.validationDiagnosticMessage',
    {
      defaultMessage: '{severity, select, error {Error: {message}} other {Warning: {message}}}',
      values: { severity, message },
    }
  );
};
