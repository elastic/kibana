/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TABLE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.tableTitle',
  {
    defaultMessage: 'Change history',
  }
);

export const TABLE_SUBTITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.tableSubtitle',
  {
    defaultMessage: 'A log of historical rule changes',
  }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.searchPlaceholder',
  {
    defaultMessage: 'Search',
  }
);

export const COLUMN_REVISION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.revisionColumn',
  {
    defaultMessage: 'Revision',
  }
);

export const COLUMN_REVISION_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.revisionColumnTooltip',
  {
    defaultMessage:
      'Each change increments the revision number. Numbering starts when change history was introduced',
  }
);

export const COLUMN_USER = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.userColumn',
  {
    defaultMessage: 'User',
  }
);

export const COLUMN_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.messageColumn',
  {
    defaultMessage: 'Message',
  }
);

export const COLUMN_MESSAGE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.messageColumnTooltip',
  {
    defaultMessage: 'Relevant message from execution outcome.',
  }
);
