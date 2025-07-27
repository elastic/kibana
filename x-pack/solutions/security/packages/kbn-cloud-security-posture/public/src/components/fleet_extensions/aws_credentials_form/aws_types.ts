/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudConnectorType } from '../types';
import { AWS_ORGANIZATION_ACCOUNT, AWS_SINGLE_ACCOUNT, AWS_SETUP_FORMAT } from '../constants';

export type SetupFormat = typeof AWS_SETUP_FORMAT.CLOUD_FORMATION | typeof AWS_SETUP_FORMAT.MANUAL;

export type AwsAccountType = typeof AWS_SINGLE_ACCOUNT | typeof AWS_ORGANIZATION_ACCOUNT;
export type AwsCredentialsType =
  | CloudConnectorType
  | 'assume_role'
  | 'direct_access_keys'
  | 'temporary_keys'
  | 'shared_credentials'
  | 'cloud_formation';
