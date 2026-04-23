/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getIndexPattern(namespace: string): string {
  return `logs-aws.cloudtrail-${namespace}`;
}

/**
 * IAM principal types that represent human actors.
 * Excludes AWSService (internal AWS-to-AWS) and AWSAccount (cross-account service calls).
 */
export const HUMAN_IAM_IDENTITY_TYPES = [
  'IAMUser',
  'AssumedRole',
  'Root',
  'FederatedUser',
  'IdentityCenterUser',
];
