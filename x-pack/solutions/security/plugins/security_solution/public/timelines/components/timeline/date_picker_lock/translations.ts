/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP = i18n.translate(
  'xpack.securitySolution.timeline.properties.lockDatePickerTooltip',
  {
    defaultMessage:
      'Click to disable syncing of query time range with the current page’s time range',
  }
);

export const UNLOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP = i18n.translate(
  'xpack.securitySolution.timeline.properties.unlockDatePickerTooltip',
  {
    defaultMessage: 'Click to sync the query time range with the current page’s time range.',
  }
);

export const LOCK_SYNC_MAIN_DATE_PICKER_ARIA = i18n.translate(
  'xpack.securitySolution.timeline.properties.lockDatePickerDescription',
  {
    defaultMessage: 'Lock global date picker to timeline date picker',
  }
);

export const UNLOCK_SYNC_MAIN_DATE_PICKER_ARIA = i18n.translate(
  'xpack.securitySolution.timeline.properties.unlockDatePickerDescription',
  {
    defaultMessage: 'Unlock global date picker from timeline date picker',
  }
);
