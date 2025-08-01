/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ADD_NEW_CONNECTOR_DROPDOWN_BUTTON =
  '[data-test-subj="dropdown-connector-add-connector"]';

export const CONNECTOR = (id: string) => {
  return `[data-test-subj='dropdown-connector-${id}']`;
};

export const CONNECTOR_NAME = '[data-test-subj="nameInput"]';

export const CONNECTORS_DROPDOWN = '[data-test-subj="dropdown-connectors"]';

export const JIRA_CONNECTOR_CARD = '[data-test-subj=".jira-card"]';

export const JIRA_API_TOKEN = '[data-test-subj="secrets.apiToken-input"';

export const JIRA_EMAIL = '[data-test-subj="secrets.email-input"]';

export const JIRA_PROJECT_KEY = '[data-test-subj="config.projectKey-input"]';

export const JIRA_URL = '[data-test-subj="config.apiUrl-input"]';

export const PASSWORD = '[data-test-subj="connector-servicenow-password-form-input"]';

export const SAVE_BTN = '[data-test-subj="create-connector-flyout-save-btn"]';

export const SERVICE_NOW_CONNECTOR_CARD = '[data-test-subj=".servicenow-card"]';

export const TOASTER = '[data-test-subj="euiToastHeader"]';

export const URL = '[data-test-subj="credentialsApiUrlFromInput"]';

export const USERNAME = '[data-test-subj="connector-servicenow-username-form-input"]';

export const MAPPING = 'code[data-test-subj="field-mapping-target"]';
