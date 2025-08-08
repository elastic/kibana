/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AWS_SETUP_FORMAT } from './constants';

export type AwsCredentialsType =
  | 'assume_role'
  | 'direct_access_keys'
  | 'temporary_keys'
  | 'shared_credentials'
  | 'cloud_formation'
  | 'cloud_connectors';

export type AwsSetupFormat =
  | typeof AWS_SETUP_FORMAT.CLOUD_FORMATION
  | typeof AWS_SETUP_FORMAT.MANUAL;
