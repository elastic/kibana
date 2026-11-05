/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SKIP_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.skipButton',
  { defaultMessage: 'Skip' }
);

export const SKIP_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.skipButtonAriaLabel',
  { defaultMessage: 'Skip this step and continue without uploading all the items' }
);

export const emptyLookupNameError = (fileName: string): string =>
  i18n.translate(
    'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.emptyLookupNameErrorMessage',
    {
      defaultMessage: '"{fileName}" cannot be uploaded because its lookup name is empty.',
      values: { fileName },
    }
  );

export const lookupFileNameMismatchError = (fileName?: string): string => {
  if (fileName == null) {
    return i18n.translate(
      'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.lookupFileNameMismatchErrorMessage',
      { defaultMessage: 'The file name must match one of the lookup names in the list above.' }
    );
  }
  return i18n.translate(
    'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.lookupFileNameMismatchWithFileNameErrorMessage',
    {
      defaultMessage:
        '{fileName}: The file name must match one of the lookup names in the list above.',
      values: { fileName },
    }
  );
};

export const referenceSetNameMismatchError = (name: string): string =>
  i18n.translate(
    'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.referenceSetNameMismatchErrorMessage',
    {
      defaultMessage:
        'Reference set "{name}" must match a name in the list above. See `name` field in reference set export.',
      values: { name },
    }
  );

export const watchlistNameMismatchError = (name: string): string =>
  i18n.translate(
    'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.watchlistNameMismatchErrorMessage',
    {
      defaultMessage:
        'Watchlist "{name}" must match a name in the list above. The name is taken from the watchlist alias, not the file name.',
      values: { name },
    }
  );
