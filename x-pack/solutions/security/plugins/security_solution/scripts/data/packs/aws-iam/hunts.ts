/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Hunt } from '../types';

export const hunts: Hunt[] = [
  {
    name: 'AWS IAM Access Key Created for Another User',
    language: 'kuery',
    query: 'event.action: "CreateAccessKey" and cloud.provider: "aws"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0003',
        tacticName: 'Persistence',
        technique: 'T1098.001',
        techniqueName: 'Additional Cloud Credentials',
      },
    ],
    falsePositives: [
      {
        '@timestamp': '2026-07-13T08:20:00.000Z',

        ecs: { version: '8.11.0' },
        data_stream: { type: 'logs', dataset: 'aws.cloudtrail', namespace: 'default' },
        cloud: { provider: 'aws', region: 'us-east-1', account: { id: '123456789012' } },
        event: {
          action: 'CreateAccessKey',
          category: ['iam'],
          outcome: 'success',
          kind: 'event',
          dataset: 'aws.cloudtrail',
          module: 'aws',
        },
        user: {
          name: 'key-rotation-lambda',
          id: 'AROA_KEY_ROTATION',
        },
        'user.target': {
          name: 'monitoring-svc',
          id: 'AIDA_MONITORING_SVC',
        },
        source: { ip: '192.0.2.20' },
        aws: {
          cloudtrail: {
            event_type: 'AwsApiCall',
            user_identity: {
              type: 'AssumedRole',
              arn: 'arn:aws:iam::123456789012:role/key-rotation-lambda',
              invokedBy: 'lambda.amazonaws.com',
            },
            request_parameters: { userName: 'monitoring-svc' },
          },
        },
        related: { user: ['key-rotation-lambda', 'monitoring-svc'], ip: ['192.0.2.20'] },
      },
    ],
  },
  {
    name: 'AWS IAM Privilege Escalation via Policy Attachment',
    language: 'kuery',
    query: 'event.action: "AttachUserPolicy" and cloud.provider: "aws"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0004',
        tacticName: 'Privilege Escalation',
        technique: 'T1078.004',
        techniqueName: 'Cloud Accounts',
      },
    ],
    falsePositives: [
      {
        '@timestamp': '2026-07-13T08:25:00.000Z',

        ecs: { version: '8.11.0' },
        data_stream: { type: 'logs', dataset: 'aws.cloudtrail', namespace: 'default' },
        cloud: { provider: 'aws', region: 'us-east-1', account: { id: '123456789012' } },
        event: {
          action: 'AttachUserPolicy',
          category: ['iam'],
          outcome: 'success',
          kind: 'event',
          dataset: 'aws.cloudtrail',
          module: 'aws',
        },
        user: {
          name: 'terraform-ci',
          id: 'AIDA_TERRAFORM_CI',
        },
        'user.target': {
          name: 'monitoring-svc',
          id: 'AIDA_MONITORING_SVC',
        },
        source: { ip: '192.0.2.20' },
        aws: {
          cloudtrail: {
            event_type: 'AwsApiCall',
            user_identity: {
              type: 'AssumedRole',
              arn: 'arn:aws:iam::123456789012:role/terraform-ci',
            },
            request_parameters: {
              policyArn: 'arn:aws:iam::aws:policy/ReadOnlyAccess',
              userName: 'monitoring-svc',
            },
          },
        },
        related: { user: ['terraform-ci', 'monitoring-svc'], ip: ['192.0.2.20'] },
      },
    ],
  },
  {
    name: 'AWS Secrets Manager - Unauthorized Access',
    language: 'kuery',
    query: 'event.action: "GetSecretValue" and cloud.provider: "aws"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0006',
        tacticName: 'Credential Access',
        technique: 'T1555',
        techniqueName: 'Credentials from Password Stores',
      },
    ],
  },
  {
    name: 'AWS S3 Bulk Data Download',
    language: 'kuery',
    query: 'event.action: "GetObject" and cloud.provider: "aws"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0010',
        tacticName: 'Exfiltration',
        technique: 'T1537',
        techniqueName: 'Transfer Data to Cloud Account',
      },
    ],
  },
  {
    name: 'AWS CloudTrail Logging Disabled',
    language: 'kuery',
    query: 'event.action: "StopLogging" and cloud.provider: "aws"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0005',
        tacticName: 'Defense Evasion',
        technique: 'T1562.008',
        techniqueName: 'Disable or Modify Cloud Logs',
      },
    ],
  },
];
