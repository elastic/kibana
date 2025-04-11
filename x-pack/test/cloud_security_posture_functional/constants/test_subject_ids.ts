/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const testSubjectIds = {
  CIS_AWS_OPTION_TEST_ID: 'cisAwsTestId',
  AWS_SINGLE_ACCOUNT_TEST_ID: 'awsSingleTestId',
  AWS_MANUAL_TEST_ID: 'aws-manual-setup-option',
  AWS_CREDENTIAL_SELECTOR: 'aws-credentials-type-selector',
  ROLE_ARN_TEST_ID: 'awsRoleArnInput',
  DIRECT_ACCESS_KEY_ID_TEST_ID: 'awsDirectAccessKeyId',
  DIRECT_ACCESS_SECRET_KEY_TEST_ID: 'passwordInput-secret-access-key',
  TEMP_ACCESS_KEY_ID_TEST_ID: 'awsTemporaryKeysAccessKeyId',
  TEMP_ACCESS_KEY_SECRET_KEY_TEST_ID: 'passwordInput-secret-access-key',
  TEMP_ACCESS_SESSION_TOKEN_TEST_ID: 'awsTemporaryKeysSessionToken',
  SHARED_CREDENTIALS_FILE_TEST_ID: 'awsSharedCredentialFile',
  SHARED_CREDETIALS_PROFILE_NAME_TEST_ID: 'awsCredentialProfileName',
  CIS_GCP_OPTION_TEST_ID: 'cisGcpTestId',
  GCP_ORGANIZATION_TEST_ID: 'gcpOrganizationAccountTestId',
  GCP_SINGLE_ACCOUNT_TEST_ID: 'gcpSingleAccountTestId',
  GCP_CLOUD_SHELL_TEST_ID: 'gcpGoogleCloudShellOptionTestId',
  GCP_MANUAL_TEST_ID: 'gcpManualOptionTestId',
  PRJ_ID_TEST_ID: 'project_id_test_id',
  ORG_ID_TEST_ID: 'organization_id_test_id',
  CREDENTIALS_TYPE_TEST_ID: 'credentials_type_test_id',
  CREDENTIALS_FILE_TEST_ID: 'credentials_file_test_id',
  CREDENTIALS_JSON_TEST_ID: 'textAreaInput-credentials-json',
  CIS_AZURE_OPTION_TEST_ID: 'cisAzureTestId',
  CIS_AZURE_SINGLE_SUB_TEST_ID: 'azureSingleAccountTestId',
  AZURE_CREDENTIAL_SELECTOR: 'azure-credentials-type-selector',
  CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS: {
    TENANT_ID: 'cisAzureTenantId',
    CLIENT_ID: 'cisAzureClientId',
    CLIENT_SECRET: 'passwordInput-client-secret',
    CLIENT_CERTIFICATE_PATH: 'cisAzureClientCertificatePath',
    CLIENT_CERTIFICATE_PASSWORD: 'passwordInput-client-certificate-password',
    CLIENT_USERNAME: 'cisAzureClientUsername',
    CLIENT_PASSWORD: 'cisAzureClientPassword',
  },
  CIS_AZURE_SETUP_FORMAT_TEST_SUBJECTS: {
    ARM_TEMPLATE: 'cisAzureArmTemplate',
    MANUAL: 'cisAzureManual',
  },
  EVENTS_TABLE_ROW_CSS_SELECTOR: '[data-test-subj="events-viewer-panel"] .euiDataGridRow',
  VISUALIZATIONS_SECTION_HEADER_TEST_ID: 'securitySolutionFlyoutVisualizationsHeader',
  GRAPH_PREVIEW_CONTENT_TEST_ID: 'securitySolutionFlyoutGraphPreviewContent',
  GRAPH_PREVIEW_LOADING_TEST_ID: 'securitySolutionFlyoutGraphPreviewLoading',
  GRAPH_PREVIEW_TITLE_LINK_TEST_ID: 'securitySolutionFlyoutGraphPreviewTitleLink',
  NODE_EXPAND_BUTTON_TEST_ID: 'cloudSecurityGraphNodeExpandButton',
  GRAPH_INVESTIGATION_TEST_ID: 'cloudSecurityGraphGraphInvestigation',
  GRAPH_NODE_EXPAND_POPOVER_TEST_ID: 'cloudSecurityGraphGraphInvestigationGraphNodeExpandPopover',
  GRAPH_NODE_POPOVER_EXPLORE_RELATED_TEST_ID:
    'cloudSecurityGraphGraphInvestigationExploreRelatedEntities',
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_TEST_ID:
    'cloudSecurityGraphGraphInvestigationShowActionsByEntity',
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_TEST_ID:
    'cloudSecurityGraphGraphInvestigationShowActionsOnEntity',
  GRAPH_LABEL_EXPAND_POPOVER_TEST_ID: 'cloudSecurityGraphGraphInvestigationGraphLabelExpandPopover',
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID:
    'cloudSecurityGraphGraphInvestigationShowEventsWithThisAction',
  GRAPH_ACTIONS_TOGGLE_SEARCH_ID: 'cloudSecurityGraphGraphInvestigationToggleSearch',
  GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID:
    'cloudSecurityGraphGraphInvestigationInvestigateInTimeline',
  ALERT_TABLE_ROW_CSS_SELECTOR: '[data-test-subj="alertsTable"] .euiDataGridRow',
  SETUP_TECHNOLOGY_SELECTOR: 'setup-technology-selector',
  DIRECT_ACCESS_KEYS: 'direct_access_keys',
  SETUP_TECHNOLOGY_SELECTOR_AGENTLESS_RADIO: 'setup-technology-agentless-radio',
  SETUP_TECHNOLOGY_SELECTOR_AGENT_BASED_RADIO: 'setup-technology-agent-based-radio',
};
