/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const GCP_CLOUDSHELL_TEST_ID = `${getDataTestSubjectSelector(
  'gcpGoogleCloudShellOptionTestId'
)} input`;
export const GCP_LAUNCH_GOOGLE_CLOUD_SHELL_TEST_ID = getDataTestSubjectSelector(
  'launchGoogleCloudShellAgentlessButton'
);
export const GCP_MANUAL_SETUP_TEST_ID = `${getDataTestSubjectSelector(
  'gcpManualOptionTestId'
)} input`;
export const GCP_SINGLE_ACCOUNT_TEST_ID = `${getDataTestSubjectSelector(
  'gcpSingleAccountTestId'
)} input`;
export const GCP_ORGANIZATION_ACCOUNT_TEST_ID = `${getDataTestSubjectSelector(
  'gcpOrganizationAccountTestId'
)} input`;
export const GCP_CLOUDSHELL_CANCEL_BUTTON_TEST_ID = getDataTestSubjectSelector(
  'confirmGoogleCloudShellModalCancelButton'
);
export const GCP_CREDENTIALS_TYPE_FILE_TEST_ID = getDataTestSubjectSelector(
  'credentials_file_option_test_id'
);
export const GCP_CREDENTIALS_TYPE_JSON_TEST_ID = getDataTestSubjectSelector(
  'credentials_json_option_test_id'
);
export const GCP_ORGANIZATION_ID_TEST_ID = getDataTestSubjectSelector('organization_id_test_id');

export const GCP_PROJECT_ID_TEST_ID = getDataTestSubjectSelector('project_id_test_id');

export const GCP_CREDENTIALS_SELECTOR_TEST_ID = getDataTestSubjectSelector(
  'credentials_type_test_id'
);
export const GCP_CREDENTIALS_FILE_TEST_ID = getDataTestSubjectSelector('credentials_file_test_id');
export const GCP_CREDENTIALS_JSON_TEST_ID = getDataTestSubjectSelector(
  'textAreaInput-credentials-json'
);
