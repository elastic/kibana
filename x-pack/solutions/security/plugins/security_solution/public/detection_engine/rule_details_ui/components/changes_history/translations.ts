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

export const NO_CHANGE_HISTORY_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleChangesHistory.noChangeHistoryTitle',
  {
    defaultMessage: 'No changes have been recorded for this rule yet.',
  }
);

export const NO_CHANGE_HISTORY_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleChangesHistory.noChangeHistoryBody',
  {
    defaultMessage: 'Subsequent edits will appear here.',
  }
);

export const CUSTOM_RULE_RESTORE_SUCCESS_TOAST = (revision: number): string =>
  i18n.translate('xpack.securitySolution.detectionEngine.ruleChangesHistory.restoreSuccessToast', {
    defaultMessage: 'Rule restored to revision {revision}',
    values: { revision },
  });

export const PREBUILT_RULE_RESTORE_SUCCESS_TOAST = (version: number, revision: number): string =>
  i18n.translate('xpack.securitySolution.detectionEngine.ruleChangesHistory.restoreSuccessToast', {
    defaultMessage: 'Rule restored to version {version} and revision {revision}',
    values: { version, revision },
  });

export const RESTORE_NO_CHANGE_TOAST = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleChangesHistory.restoreNoChangeToast',
  {
    defaultMessage: "Rule hasn't changed. The rule is already at this historical state.",
  }
);

export const RESTORE_ERROR_TOAST = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleChangesHistory.restoreErrorToast',
  {
    defaultMessage: 'Failed to restore the rule',
  }
);
