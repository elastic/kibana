/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const VERSION_HISTORY_TITLE = i18n.translate(
  'xpack.securitySolution.artifacts.versionHistory.title',
  {
    defaultMessage: 'Version history',
  }
);

export const HISTORY_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.artifacts.versionHistory.historyButtonLabel',
  {
    defaultMessage: 'History',
  }
);

export const OPEN_VERSION_HISTORY = i18n.translate(
  'xpack.securitySolution.artifacts.versionHistory.openVersionHistory',
  {
    defaultMessage: 'Open version history',
  }
);

export const CLOSE_VERSION_HISTORY = i18n.translate(
  'xpack.securitySolution.artifacts.versionHistory.closeVersionHistory',
  {
    defaultMessage: 'Close version history',
  }
);

export const TIMELINE_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.artifacts.versionHistory.timelineAriaLabel',
  {
    defaultMessage: 'Artifact change history timeline',
  }
);

export const N_CHANGES = (count: number): string =>
  i18n.translate('xpack.securitySolution.artifacts.versionHistory.nChanges', {
    defaultMessage: '{count, plural, one {# change} other {# changes}}',
    values: { count },
  });

export const ITEM_ACTIONS_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.artifacts.versionHistory.itemActionsAriaLabel',
  {
    defaultMessage: 'Change history item actions',
  }
);

export const VIEW_DETAILS_ACTION = i18n.translate(
  'xpack.securitySolution.artifacts.versionHistory.viewDetailsAction',
  {
    defaultMessage: 'View details',
  }
);

export const REVERT_ACTION = i18n.translate(
  'xpack.securitySolution.artifacts.versionHistory.revertAction',
  {
    defaultMessage: 'Revert to this version',
  }
);
