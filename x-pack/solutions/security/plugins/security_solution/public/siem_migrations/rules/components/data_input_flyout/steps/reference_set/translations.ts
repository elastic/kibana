/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const REFERENCE_SET_DATA_INPUT_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.referenceSet.title',
  { defaultMessage: 'Upload reference sets' }
);
export const REFERENCE_SET_DATA_INPUT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.referenceSet.description',
  {
    defaultMessage: `We've also found reference sets within your rules. To fully translate those rules containing these reference sets, follow the step-by-step guide to export and upload them all.`,
  }
);
