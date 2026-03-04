/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { isValidS3BucketName, buildS3BucketArn, buildCloudFormationUrl } from './utils';

describe('isValidS3BucketName()', () => {
  it('accepts valid bucket names', () => {
    expect(isValidS3BucketName('my-bucket')).toBe(true);
    expect(isValidS3BucketName('my.bucket.123')).toBe(true);
    expect(isValidS3BucketName('abc')).toBe(true); // min length
  });

  it('rejects invalid bucket names', () => {
    expect(isValidS3BucketName('')).toBe(false); // empty
    expect(isValidS3BucketName('ab')).toBe(false); // too short
    expect(isValidS3BucketName('My-Bucket')).toBe(false); // uppercase
    expect(isValidS3BucketName('my..bucket')).toBe(false); // consecutive periods
  });

  it('rejects AWS reserved patterns', () => {
    // These are obscure AWS rules worth testing explicitly
    expect(isValidS3BucketName('xn--my-bucket')).toBe(false); // S3 access point prefix
    expect(isValidS3BucketName('my-bucket-s3alias')).toBe(false); // S3 alias suffix
  });
});

describe('buildS3BucketArn()', () => {
  it('builds correct ARN from bucket name', () => {
    expect(buildS3BucketArn('my-bucket')).toBe('arn:aws:s3:::my-bucket');
  });
});

describe('buildCloudFormationUrl()', () => {
  it('builds correct CloudFormation URL with all parameters', () => {
    const url = buildCloudFormationUrl(
      'vpcflow',
      'https://otlp.example.com',
      'api-key',
      'arn:aws:s3:::bucket'
    );

    expect(url).toContain('console.aws.amazon.com/cloudformation');
    expect(url).toContain('stackName=edot-cloud-forwarder-vpcflow');
    expect(url).toContain('param_EdotCloudForwarderS3LogsType=vpcflow');
    expect(url).toContain('param_ElasticAPIKey=api-key');
    expect(url).toContain('param_SourceS3BucketARN=');
  });

  it('properly encodes special characters in parameters', () => {
    const url = buildCloudFormationUrl(
      'cloudtrail',
      'https://otlp.example.com/v1/logs',
      'key+with/special=chars',
      'arn:aws:s3:::bucket'
    );

    expect(url).toContain('param_ElasticAPIKey=key%2Bwith%2Fspecial%3Dchars');
    expect(url).toContain('param_OTLPEndpoint=https%3A%2F%2Fotlp.example.com%2Fv1%2Flogs');
  });
});
