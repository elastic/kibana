/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const VERSION_HISTORY_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleChangesHistory.versionHistoryTitle',
  {
    defaultMessage: 'Version history',
  }
);

export const CLOSE_VERSION_HISTORY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleChangesHistory.closeVersionHistory',
  {
    defaultMessage: 'Close version history',
  }
);

export const SELECT_VERSION_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleChangesHistory.selectVersionTitle',
  {
    defaultMessage: 'Select a version',
  }
);

export const SELECT_VERSION_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleChangesHistory.selectVersionBody',
  {
    defaultMessage: 'Choose a version from the history panel on the right to see its changes.',
  }
);

export const NO_VISIBLE_CHANGES_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleChangesHistory.noVisibleChangesTitle',
  {
    defaultMessage: 'No visible field changes',
  }
);

export const LOADING_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleChangesHistory.diffLoadingLabel',
  {
    defaultMessage: 'Loading changes',
  }
);
