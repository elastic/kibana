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
    defaultMessage: 'History',
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

export const CHANGE_DETAILS_FLYOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.changeDetailsFlyoutTitle',
  {
    defaultMessage: 'Event change details',
  }
);

export const CHANGE_DETAILS_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.changeDetailsPanelTitle',
  {
    defaultMessage: 'Event change details',
  }
);

export const CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.cancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const RESTORE_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.revertButtonLabel',
  {
    defaultMessage: 'Restore this revision',
  }
);

export const CONFIRM_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.confirmButtonLabel',
  {
    defaultMessage: 'Confirm',
  }
);

export const CONFIRM_RESTORE_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.restoreModalTitle',
  {
    defaultMessage: 'Restore revision',
  }
);

export const CONFIRM_RESTORE_MODAL_MESSAGE_1 = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.restoreModalMessage1',
  {
    defaultMessage: 'You are about to restore a historical revision of this rule.',
  }
);

export const CONFIRM_RESTORE_MODAL_MESSAGE_2 = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.restoreModalMessage2',
  {
    defaultMessage:
      'This will create a new entry in the history using the details found on this change.',
  }
);

export const CONFIRM_RESTORE_MODAL_MESSAGE_3 = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.restoreModalMessage3',
  {
    defaultMessage: 'Do you wish to continue?',
  }
);

export const RULE_RESTORED_SUCESSFULLY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.restoreSuccess',
  {
    defaultMessage: 'Rule restored successfully',
  }
);

export const CHANGE_DETAILS_TAB_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.changeDetailsTabTitle',
  {
    defaultMessage: 'Change details',
  }
);

export const NO_CHANGES_DETECTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.noChangesDetected',
  {
    defaultMessage: 'No changes detected.',
  }
);

export const OVERVIEW_AT_SAVE_TAB_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.overviewAtSaveTabTitle',
  {
    defaultMessage: 'Overview at save',
  }
);

export const OVERVIEW_ABOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.overviewAboutTitle',
  {
    defaultMessage: 'About',
  }
);

export const OVERVIEW_DEFINITION_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.overviewDefinitionTitle',
  {
    defaultMessage: 'Definition',
  }
);

export const COMPARING_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.comparingLabel',
  {
    defaultMessage: 'Comparing: ',
  }
);

export const REVISION_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.revisionLabel',
  {
    defaultMessage: 'Revision ',
  }
);

export const AGAINST_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.againstLabel',
  {
    defaultMessage: ' against ',
  }
);

export const UPDATED_BY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.updatedByLabel',
  {
    defaultMessage: ' Updated by: ',
  }
);

export const ON_DATE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.onDateLabel',
  {
    defaultMessage: ' on ',
  }
);

export const FIELD_CHANGES_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.fieldChangesLabel',
  {
    defaultMessage: 'Field changes: ',
  }
);
