/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const ROLE_ARN = getDataTestSubjectSelector('awsRoleArnInput');
export const ACCESS_KEY = getDataTestSubjectSelector('awsDirectAccessKeyId');
export const SECRET_KEY = getDataTestSubjectSelector('passwordInput-secret-access-key');
export const TEMPORARY_KEY_ACCESS_KEY = getDataTestSubjectSelector('awsTemporaryKeysAccessKeyId');
export const TEMPORARY_KEY_SECRET_KEY = getDataTestSubjectSelector(
  'passwordInput-secret-access-key'
);
export const TEMPORARY_KEY_SESSION = getDataTestSubjectSelector('awsTemporaryKeysSessionToken');
export const SHARED_CREDENTIAL_FILE = getDataTestSubjectSelector('awsSharedCredentialFile');
export const SHARED_CREDENTIAL_PROFILE = getDataTestSubjectSelector('awsCredentialProfileName');
export const AWS_SINGLE_ACCOUNT_TEST_ID = `${getDataTestSubjectSelector('awsSingleTestId')} input`;
export const AWS_ORGANIZATION_ACCOUNT_TEST_ID = `${getDataTestSubjectSelector(
  'awsOrganizationTestId'
)} input`;
export const AWS_CLOUD_FORMATION_TEST_ID = `${getDataTestSubjectSelector(
  'aws-cloudformation-setup-option'
)} input`;
export const AWS_MANUAL_SETUP_TEST_ID = `${getDataTestSubjectSelector(
  'aws-manual-setup-option'
)} input`;
export const AWS_CREDENTIALS_SELECTOR_TEST_ID = getDataTestSubjectSelector(
  'aws-credentials-type-selector'
);
export const LAUNCH_CLOUD_FORMATION_LATER_TEST_ID = getDataTestSubjectSelector(
  'confirmCloudFormationModalCancelButton'
);
