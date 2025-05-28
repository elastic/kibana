/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOOKUPS_DATA_INPUT_COPY_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.missingLookupsList.title',
  { defaultMessage: 'Lookups found in your rules' }
);

export const LOOKUPS_SPLUNK_APP = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.missingLookupsList.appSection',
  { defaultMessage: 'Splunk App for Lookup File Editing' }
);

export const COPY_LOOKUP_NAME_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.missingLookupsList.copyLookupNameTooltip',
  { defaultMessage: 'Copy lookup name' }
);
export const CLEAR_EMPTY_LOOKUP_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.missingLookupsList.clearEmptyLookupTooltip',
  { defaultMessage: 'Mark the lookup as empty' }
);
