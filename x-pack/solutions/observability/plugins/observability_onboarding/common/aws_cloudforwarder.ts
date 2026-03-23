/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CLOUDFORWARDER_CLOUDFORMATION_TEMPLATE_URL =
  'https://edot-cloud-forwarder.s3.amazonaws.com/v1/latest/cloudformation/s3_logs-cloudformation.yaml';

/**
 * CloudFormation stack configurations for different AWS log types.
 */
export const CLOUDFORMATION_STACK_CONFIGS = {
  vpcflow: {
    stackName: 'edot-cloud-forwarder-vpcflow',
    logType: 'vpcflow',
  },
  elbaccess: {
    stackName: 'edot-cloud-forwarder-elbaccess',
    logType: 'elbaccess',
  },
  cloudtrail: {
    stackName: 'edot-cloud-forwarder-cloudtrail',
    logType: 'cloudtrail',
  },
} as const;

export type LogType = keyof typeof CLOUDFORMATION_STACK_CONFIGS;
