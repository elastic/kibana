/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOOKUPS_DATA_INPUT_FILE_UPLOAD_PROMPT = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.lookupsFileUpload.prompt',
  { defaultMessage: 'Select or drag and drop the exported lookup files' }
);

export const REFERENCE_SETS_DATA_INPUT_FILE_UPLOAD_PROMPT = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.referenceSetsFileUpload.prompt',
  { defaultMessage: 'Select or drag and drop the exported reference set files' }
);

export const LOOKUPS_DATA_INPUT_FILE_UPLOAD_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.lookupsFileUpload.label',
  { defaultMessage: 'Upload lookups files' }
);

export const REFERENCE_SETS_DATA_INPUT_FILE_UPLOAD_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.referenceSetsFileUpload.label',
  { defaultMessage: 'Upload reference set files' }
);

export const WATCHLISTS_DATA_INPUT_FILE_UPLOAD_PROMPT = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.watchlistsFileUpload.prompt',
  { defaultMessage: 'Select or drag and drop the exported watchlist files' }
);

export const WATCHLISTS_DATA_INPUT_FILE_UPLOAD_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.watchlistsFileUpload.label',
  { defaultMessage: 'Upload watchlist files' }
);

export const SKIP_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.skipButton',
  { defaultMessage: 'Skip' }
);

export const SKIP_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.skipButtonAriaLabel',
  { defaultMessage: 'Skip this step and continue without uploading all the items' }
);
