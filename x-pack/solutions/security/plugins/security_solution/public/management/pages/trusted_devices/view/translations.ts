/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { TrustedDeviceConditionEntryField } from '@kbn/securitysolution-utils';

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
      'Allow a specific external device to connect to your endpoints, even when Device Control is enabled.',
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

export const OS_OPTIONS_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.trustedDevices.form.osOptionsPlaceholder',
  {
    defaultMessage: 'Select an operating system',
  }
);

export const POLICY_SELECT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.trustedDevices.form.policySelectDescription',
  {
    defaultMessage: 'Optionally select policies to assign this trusted device to.',
  }
);

export const CONDITION_FIELD_TITLE: { [K in TrustedDeviceConditionEntryField]: string } = {
  [TrustedDeviceConditionEntryField.USERNAME]: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.username',
    {
      defaultMessage: 'Username',
    }
  ),
  [TrustedDeviceConditionEntryField.HOST]: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.host',
    {
      defaultMessage: 'Host',
    }
  ),
  [TrustedDeviceConditionEntryField.DEVICE_ID]: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.deviceId',
    {
      defaultMessage: 'Device ID',
    }
  ),
  [TrustedDeviceConditionEntryField.MANUFACTURER]: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.manufacturer',
    {
      defaultMessage: 'Manufacturer',
    }
  ),
  [TrustedDeviceConditionEntryField.PRODUCT_ID]: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.productId',
    {
      defaultMessage: 'Product ID',
    }
  ),
  [TrustedDeviceConditionEntryField.PRODUCT_NAME]: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.productName',
    {
      defaultMessage: 'Product Name',
    }
  ),
  [TrustedDeviceConditionEntryField.DEVICE_TYPE]: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.deviceType',
    {
      defaultMessage: 'Device Type',
    }
  ),
  [TrustedDeviceConditionEntryField.MANUFACTURER_ID]: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.manufacturerId',
    {
      defaultMessage: 'Manufacturer ID',
    }
  ),
};

export const CONDITION_FIELD_DESCRIPTION: { [K in TrustedDeviceConditionEntryField]: string } = {
  [TrustedDeviceConditionEntryField.USERNAME]: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.description.username',
    {
      defaultMessage: 'The username of the device user',
    }
  ),
  [TrustedDeviceConditionEntryField.HOST]: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.description.host',
    {
      defaultMessage: 'The hostname of the device',
    }
  ),
  [TrustedDeviceConditionEntryField.DEVICE_ID]: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.description.deviceId',
    {
      defaultMessage: 'The serial number of the device',
    }
  ),
  [TrustedDeviceConditionEntryField.MANUFACTURER]: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.description.manufacturer',
    {
      defaultMessage: 'The vendor name of the device manufacturer',
    }
  ),
  [TrustedDeviceConditionEntryField.PRODUCT_ID]: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.description.productId',
    {
      defaultMessage: 'The product identifier of the device',
    }
  ),
  [TrustedDeviceConditionEntryField.PRODUCT_NAME]: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.description.productName',
    {
      defaultMessage: 'The product name of the device',
    }
  ),
  [TrustedDeviceConditionEntryField.DEVICE_TYPE]: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.description.deviceType',
    {
      defaultMessage: 'The type of the device',
    }
  ),
  [TrustedDeviceConditionEntryField.MANUFACTURER_ID]: i18n.translate(
    'xpack.securitySolution.trustedDevices.logicalConditionBuilder.entry.field.description.manufacturerId',
    {
      defaultMessage: 'The vendor identifier of the device manufacturer',
    }
  ),
};

export const OPERATOR_TITLES = {
  is: i18n.translate('xpack.securitySolution.trustedDevices.card.operator.is', {
    defaultMessage: 'is',
  }),
  matches: i18n.translate('xpack.securitySolution.trustedDevices.card.operator.matches', {
    defaultMessage: 'matches',
  }),
};

export const INPUT_ERRORS = {
  name: i18n.translate('xpack.securitySolution.trustedDevices.form.errors.nameRequired', {
    defaultMessage: 'Trusted device name is required',
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

export const VALIDATION_WARNINGS = {
  performanceWildcard: i18n.translate(
    'xpack.securitySolution.trustedDevices.form.warnings.performanceWildcard',
    {
      defaultMessage: 'Double wildcards (**) may cause performance issues',
    }
  ),
};
