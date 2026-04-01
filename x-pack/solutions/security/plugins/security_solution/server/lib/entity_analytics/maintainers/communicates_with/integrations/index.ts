/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { CommunicatesWithIntegrationConfig } from './types';

import { awsCloudTrailIntegration } from './aws_cloudtrail';
import { azureSigninLogsIntegration } from './azure_signinlogs';
import { oktaIntegration } from './okta';
import { jamfProIntegration } from './jamf_pro';
import type { CommunicatesWithIntegrationConfig } from './types';

export const INTEGRATION_CONFIGS: CommunicatesWithIntegrationConfig[] = [
  awsCloudTrailIntegration,
  azureSigninLogsIntegration,
  oktaIntegration,
  jamfProIntegration,
];
