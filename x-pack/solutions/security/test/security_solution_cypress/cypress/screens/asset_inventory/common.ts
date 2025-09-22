/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const ADD_ELASTIC_AGENT_LATER_TEST_ID = getDataTestSubjectSelector(
  'confirmModalCancelButton'
);
export const SAVE_BUTTON = getDataTestSubjectSelector('createPackagePolicySaveButton');
export const SAVE_EDIT_BUTTON = getDataTestSubjectSelector('saveIntegration');

export const AWS_PROVIDER_TEST_ID = `${getDataTestSubjectSelector('caiAwsTestId')} input`;
export const GCP_PROVIDER_TEST_ID = `${getDataTestSubjectSelector('caiGcpTestId')} input`;
export const AZURE_PROVIDER_TEST_ID = `${getDataTestSubjectSelector('caiAzureTestId')} input`;
