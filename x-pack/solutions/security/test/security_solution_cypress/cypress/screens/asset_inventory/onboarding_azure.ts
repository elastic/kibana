/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const AZURE_ARM_TEMPLATE_TEST_ID = `${getDataTestSubjectSelector(
  'caiAzureArmTemplate'
)} input`;
export const AZURE_LAUNCH_CLOUD_FORMATION_LATER_TEST_ID = getDataTestSubjectSelector(
  'confirmAzureArmTemplateModalCancelButton'
);
export const AZURE_CREDENTIALS_SELECTOR_TEST_ID = getDataTestSubjectSelector(
  'azure-credentials-type-selector'
);
export const AZURE_SECRET_TEST_ID = getDataTestSubjectSelector('passwordInput-client-secret');
export const AZURE_CLIENT_CERTIFICATE_PASSWORD_TEST_ID = getDataTestSubjectSelector(
  'passwordInput-client-certificate-password'
);
export const AZURE_CLIENT_SECRET_TEST_ID = getDataTestSubjectSelector(
  'passwordInput-client-secret'
);
