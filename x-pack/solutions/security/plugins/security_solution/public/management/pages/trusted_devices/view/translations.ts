/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DETAILS_HEADER = i18n.translate(
  'xpack.securitySolution.trustedDevices.form.detailsHeader',
  {
    defaultMessage: 'Details',
  }
);

export const DETAILS_HEADER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.trustedDevices.form.detailsHeaderDescription',
  {
    defaultMessage:
      'Add a trusted device to improve performance or alleviate compatibility issues.',
  }
);

export const NAME_LABEL = i18n.translate('xpack.securitySolution.trustedDevices.form.nameLabel', {
  defaultMessage: 'Name',
});

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.securitySolution.trustedDevices.form.descriptionLabel',
  {
    defaultMessage: 'Description',
  }
);

export const CONDITIONS_HEADER = i18n.translate(
  'xpack.securitySolution.trustedDevices.form.conditionsHeader',
  {
    defaultMessage: 'Conditions',
  }
);

export const CONDITIONS_HEADER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.trustedDevices.form.conditionsHeaderDescription',
  {
    defaultMessage:
      'Select operating system and add conditions. Availability of conditions may depend on your chosen operating system.',
  }
);

export const SELECT_OS_LABEL = i18n.translate(
  'xpack.securitySolution.trustedDevices.form.selectOsLabel',
  {
    defaultMessage: 'Select operating system',
  }
);

export const POLICY_SELECT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.trustedDevices.form.policySelectDescription',
  {
    defaultMessage: 'Optionally select policies to assign this trusted device to.',
  }
);

// Field definitions (mirroring TA structure)
export const CONDITION_FIELD_TITLE = {
  fieldOne: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.fieldOne',
    {
      defaultMessage: 'Field One',
    }
  ),
  fieldTwo: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.fieldTwo',
    {
      defaultMessage: 'Field Two',
    }
  ),
  fieldThree: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.fieldThree',
    {
      defaultMessage: 'Field Three',
    }
  ),
};

export const CONDITION_FIELD_DESCRIPTION = {
  fieldOne: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.description.fieldOne',
    {
      defaultMessage: 'Description for field one',
    }
  ),
  fieldTwo: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.description.fieldTwo',
    {
      defaultMessage: 'Description for field two',
    }
  ),
  fieldThree: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.description.fieldThree',
    {
      defaultMessage: 'Description for field three',
    }
  ),
};

// Operator definitions (mirroring TA structure)
export const OPERATOR_TITLES = {
  is: i18n.translate('xpack.securitySolution.trustedDevices.card.operator.is', {
    defaultMessage: 'is',
  }),
  matches: i18n.translate('xpack.securitySolution.trustedDevices.card.operator.matches', {
    defaultMessage: 'matches',
  }),
};

export const INPUT_ERRORS = {
  name: (itemName: string) =>
    i18n.translate('xpack.securitySolution.trustedDevices.form.errors.nameRequired', {
      defaultMessage: '{itemName} name is required',
      values: { itemName },
    }),
  entries: i18n.translate('xpack.securitySolution.trustedDevices.form.errors.entriesRequired', {
    defaultMessage: 'At least one condition is required',
  }),
  entriesDuplicateFields: (duplicateFields: string[]) =>
    i18n.translate('xpack.securitySolution.trustedDevices.form.errors.entriesDuplicateFields', {
      defaultMessage: 'Duplicate field(s): {duplicateFields}',
      values: { duplicateFields: duplicateFields.join(', ') },
    }),
  invalidHash: i18n.translate('xpack.securitySolution.trustedDevices.form.errors.invalidHash', {
    defaultMessage: 'Invalid hash value',
  }),
  invalidPath: i18n.translate('xpack.securitySolution.trustedDevices.form.errors.invalidPath', {
    defaultMessage: 'Invalid path',
  }),
  invalidField: i18n.translate('xpack.securitySolution.trustedDevices.form.errors.invalidField', {
    defaultMessage: 'Field entry must have a value',
  }),
  // Backend schema-aligned validation messages
  nameMaxLength: i18n.translate('xpack.securitySolution.trustedDevices.form.errors.nameMaxLength', {
    defaultMessage: 'Name cannot exceed 256 characters',
  }),
  descriptionMaxLength: i18n.translate(
    'xpack.securitySolution.trustedDevices.form.errors.descriptionMaxLength',
    {
      defaultMessage: 'Description cannot exceed 256 characters',
    }
  ),
  osRequired: i18n.translate('xpack.securitySolution.trustedDevices.form.errors.osRequired', {
    defaultMessage: 'Operating system selection is required',
  }),
  entryValueEmpty: i18n.translate(
    'xpack.securitySolution.trustedDevices.form.errors.entryValueEmpty',
    {
      defaultMessage: 'Condition value cannot be empty',
    }
  ),
  entriesAtLeastOne: i18n.translate(
    'xpack.securitySolution.trustedDevices.form.errors.entriesAtLeastOne',
    {
      defaultMessage: 'At least one condition must be specified',
    }
  ),
};

// Validation warnings
export const VALIDATION_WARNINGS = {
  performanceWildcard: i18n.translate(
    'xpack.securitySolution.trustedDevices.form.warnings.performanceWildcard',
    {
      defaultMessage: 'Double wildcards (**) may cause performance issues',
    }
  ),
};
