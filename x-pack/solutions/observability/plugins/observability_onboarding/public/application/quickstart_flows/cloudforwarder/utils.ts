/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CLOUDFORWARDER_CLOUDFORMATION_TEMPLATE_URL,
  CLOUDFORMATION_STACK_CONFIGS,
  type LogType,
} from '../../../../common/aws_cloudforwarder';

export type { LogType };

/**
 * Validates S3 bucket names according to AWS naming rules:
 * - 3-63 characters long
 * - Only lowercase letters, numbers, hyphens, and periods
 * - Must start and end with a letter or number
 * - Cannot contain consecutive periods
 * - Cannot start with 'xn--' (reserved for S3 access points)
 * - Cannot end with '-s3alias' (reserved for S3 access point aliases)
 *
 * @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
 */
const S3_BUCKET_NAME_REGEX = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

export function isValidS3BucketName(bucketName: string): boolean {
  return (
    S3_BUCKET_NAME_REGEX.test(bucketName) &&
    !bucketName.includes('..') &&
    !bucketName.startsWith('xn--') &&
    !bucketName.endsWith('-s3alias')
  );
}

/**
 * Builds an S3 bucket ARN from a bucket name.
 * Format: arn:aws:s3:::bucket-name
 */
export function buildS3BucketArn(bucketName: string): string {
  return `arn:aws:s3:::${bucketName}`;
}

/**
 * Builds a CloudFormation console URL with pre-filled parameters for deploying
 * the EDOT Cloud Forwarder. The URL includes the template URL, stack name, log type,
 * OTLP endpoint, API key, and S3 bucket ARN as hash parameters for the AWS CloudFormation console.
 */
export function buildCloudFormationUrl(
  logType: LogType,
  otlpEndpoint: string,
  apiKey: string,
  s3BucketArn: string
): string {
  const config = CLOUDFORMATION_STACK_CONFIGS[logType];
  const url = new URL('https://console.aws.amazon.com/cloudformation/home');
  // The param_* names below must match the CloudFormation template parameter names exactly
  const params = new URLSearchParams({
    templateURL: CLOUDFORWARDER_CLOUDFORMATION_TEMPLATE_URL,
    stackName: config.stackName,
    param_EdotCloudForwarderS3LogsType: config.logType, // eslint-disable-line @typescript-eslint/naming-convention
    param_OTLPEndpoint: otlpEndpoint, // eslint-disable-line @typescript-eslint/naming-convention
    param_ElasticAPIKey: apiKey, // eslint-disable-line @typescript-eslint/naming-convention
    param_SourceS3BucketARN: s3BucketArn, // eslint-disable-line @typescript-eslint/naming-convention
  });

  url.hash = `/stacks/create/review?${params.toString()}`;
  return url.toString();
}
