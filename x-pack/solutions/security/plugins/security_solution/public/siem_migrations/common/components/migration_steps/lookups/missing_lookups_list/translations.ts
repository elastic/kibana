/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOOKUPS_SPLUNK_APP = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.missingLookupsList.appSection',
  { defaultMessage: 'Splunk App for Lookup File Editing' }
);

export const REFERENCE_SETS_QRADAR_APP = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.missingReferenceSetsList.qradarAppSection',
  {
    defaultMessage:
      "We've also found reference sets within your rules. To fully translate those rules containing these reference sets, follow the step-by-step guide to export and upload them all.",
  }
);

export const COPY_LOOKUP_NAME_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.missingLookupsList.copyLookupNameTooltip',
  { defaultMessage: 'Copy lookup name' }
);

export const COPY_REFERENCE_SET_NAME_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.missingReferenceSetsList.copyReferenceSetNameTooltip',
  { defaultMessage: 'Copy reference set name' }
);

export const CLEAR_EMPTY_LOOKUP_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.missingLookupsList.clearEmptyLookupTooltip',
  { defaultMessage: 'Mark the lookup as empty' }
);

export const CLEAR_EMPTY_REFERENCE_SET_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.missingReferenceSetsList.clearEmptyReferenceSetTooltip',
  { defaultMessage: 'Mark the reference set as empty' }
);
