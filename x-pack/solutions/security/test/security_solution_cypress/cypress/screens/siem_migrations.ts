/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector, getDataTestSubjectSelectorStartWith } from '../helpers/common';
import { bedrockConnectorAPIPayload } from '../tasks/api_calls/connectors';

export const ONBOARDING_SIEM_MIGRATION_TOPIC = getDataTestSubjectSelector('siem_migrations');

export const ONBOARDING_SIEM_MIGRATION_CARDS = {
  AI_CONNECTORS: '#ai_connectors',
  SELECT_CONNECTORS: getDataTestSubjectSelector('connector-selector'),
  MIGRATE_RULES: '#migrate_rules',
};

export const UPLOAD_RULES_BTN = getDataTestSubjectSelector('startMigrationUploadRulesButton');
export const UPLOAD_RULES_FLYOUT = getDataTestSubjectSelector('uploadRulesFlyout');
export const UPLOAD_RULES_FILE_PICKER = getDataTestSubjectSelector('rulesFilePicker');
export const UPLOAD_RULES_FILE_BTN = getDataTestSubjectSelector('uploadFileButton');
export const MIGRATION_NAME_INPUT = getDataTestSubjectSelector('migrationNameInput');
export const MIGRATION_PANEL_NAME = getDataTestSubjectSelector('migrationPanelTitleName');

export const START_MIGRATION_FROM_FLYOUT_BTN = getDataTestSubjectSelector('startMigrationButton');

export const RULE_MIGRATIONS_GROUP_PANEL = getDataTestSubjectSelector('ruleMigrationPanelGroup');
export const ONBOARDING_RULE_MIGRATIONS_LIST = getDataTestSubjectSelectorStartWith('migration-');

export const ONBOARDING_TRANSLATIONS_RESULT_TABLE = {
  TABLE: getDataTestSubjectSelector('translationsResults'),
  TRANSLATION_STATUS: (status: string) => getDataTestSubjectSelector(`translationStatus-${status}`),
  TRANSLATION_STATUS_COUNT: (status: string) =>
    getDataTestSubjectSelector(`translationStatusCount-${status}`),
};

export const TRANSLATED_RULES_RESULT_TABLE = {
  TABLE: getDataTestSubjectSelector('rules-translation-table'),
  ROWS: `${getDataTestSubjectSelectorStartWith('rules-translation-table')} .euiTableRow`,
  STATUS: (status: string) => getDataTestSubjectSelector(`translationStatus-${status}`),
  RULE_NAME: getDataTestSubjectSelector('ruleName'),
};

export const TRANSLATED_RULE_DETAILS_FLYOUT = getDataTestSubjectSelector(
  'ruleMigrationDetailsFlyout'
);

export const TRANSLATED_RULE_QUERY_EDITOR_PARENT = `${getDataTestSubjectSelector(
  'kibanaCodeEditor'
)}`;

export const TRANSLATED_RULE_QUERY_EDITOR_QUERY_CONTAINER = `${TRANSLATED_RULE_QUERY_EDITOR_PARENT} .view-lines`;

export const TRANSLATED_RULE_QUERY_EDITOR_INPUT = `${TRANSLATED_RULE_QUERY_EDITOR_PARENT} textarea`;

export const TRANSLATED_RULE_EDIT_BTN = getDataTestSubjectSelector('editTranslatedRuleBtn');
export const TRANSLATED_RULE_SAVE_BTN = getDataTestSubjectSelector('saveTranslatedRuleBtn');

export const TRANSLATED_RULE_QUERY_VIEWER = getDataTestSubjectSelector('translatedRuleQueryViewer');
export const TRANSLATED_RULE_RESULT_BADGE = getDataTestSubjectSelector('translationResultBadge');

export const RULE_MIGRATION_PROGRESS_BAR = getDataTestSubjectSelector('migrationProgressPanel');
export const RULE_MIGRATION_PROGRESS_BAR_TEXT = `${RULE_MIGRATION_PROGRESS_BAR} .euiProgress__valueText`;

export const REPROCESS_FAILED_RULES_BTN = getDataTestSubjectSelector('reprocessFailedRulesButton');

export const FAKE_BEDROCK_SELECTOR = getDataTestSubjectSelector(
  `connector-option-${bedrockConnectorAPIPayload.name}`
);

const START_MIGRATION_MODAL_PREFIX = 'startMigrationModal';
export const START_MIGRATION_MODAL = {
  MODAL: getDataTestSubjectSelector(START_MIGRATION_MODAL_PREFIX),
  CONNECTOR_SELECTOR: getDataTestSubjectSelector(
    `${START_MIGRATION_MODAL_PREFIX}-ConnectorSelector`
  ),
  PREBUILT_RULES_MATCH_SWITCH: getDataTestSubjectSelector(
    `${START_MIGRATION_MODAL_PREFIX}-PrebuiltRulesMatchingSwitch`
  ),
  START_MIGRATION_BTN: getDataTestSubjectSelector(`${START_MIGRATION_MODAL_PREFIX}-Translate`),
};

export const ONBOARDING_MIGRATION_ACTIONS = {
  OPEN_ACTIONS_MENU: getDataTestSubjectSelector('openMigrationOptionsButton'),
  RENAME_BTN: getDataTestSubjectSelector('renameMigrationItem'),
  RENAME_INPUT: getDataTestSubjectSelector('euiInlineEditModeInput'),
  RENAME_CONFIRM: getDataTestSubjectSelector('euiInlineEditModeSaveButton'),
};
