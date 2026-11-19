/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloudStrategy, buildCloudNarrative } from './cloud_strategy';

describe('cloudStrategy', () => {
  describe('match', () => {
    it('returns true for AWS CloudTrail events', () => {
      expect(
        cloudStrategy.match({
          aws: { cloudtrail: { user_identity: { arn: ['arn:aws:iam::root'] } } },
        })
      ).toBe(true);
    });

    it('returns true when cloud.provider is present', () => {
      expect(cloudStrategy.match({ cloud: { provider: ['aws'] } })).toBe(true);
    });

    it('returns true for Azure events', () => {
      expect(
        cloudStrategy.match({
          azure: {
            auditlogs: {
              properties: {
                initiated_by: { user: { user_principal_name: ['admin@corp.com'] } },
              },
            },
          },
        })
      ).toBe(true);
    });

    it('returns true for GCP events', () => {
      expect(
        cloudStrategy.match({
          gcp: { audit: { authentication_info: { principal_email: ['user@corp.gcp'] } } },
        })
      ).toBe(true);
    });

    it('returns false for non-cloud events', () => {
      expect(cloudStrategy.match({ event: { category: ['process'] } })).toBe(false);
    });
  });

  describe('buildCloudNarrative', () => {
    it('builds an AWS CloudTrail narrative', () => {
      const text = buildCloudNarrative({
        cloud: { provider: ['aws'], region: ['us-east-1'], account: { id: ['123456789012'] } },
        event: { action: ['ConsoleLogin'], outcome: ['success'] },
        aws: {
          cloudtrail: {
            user_identity: { arn: ['arn:aws:iam::root'], type: ['Root'] },
            event_type: ['AwsConsoleSignIn'],
          },
        },
        kibana: {
          alert: { severity: ['critical'], rule: { name: ['AWS Root Console Login'] } },
        },
      });

      expect(text).toBe(
        'aws event ConsoleLogin by arn:aws:iam::root (Root), event type AwsConsoleSignIn, account 123456789012, region us-east-1 with result success created critical alert AWS Root Console Login.'
      );
    });

    it('builds a GCP audit narrative', () => {
      const text = buildCloudNarrative({
        cloud: { provider: ['gcp'], region: ['us-central1'] },
        event: { action: ['SetIamPolicy'] },
        gcp: {
          audit: {
            authentication_info: { principal_email: ['admin@corp.gcp'] },
            method_name: ['SetIamPolicy'],
            resource_name: ['projects/my-project'],
          },
        },
        kibana: { alert: { severity: ['medium'], rule: { name: ['GCP IAM Change'] } } },
      });

      expect(text).toBe(
        'gcp event SetIamPolicy by admin@corp.gcp, method SetIamPolicy on resource projects/my-project, region us-central1 created medium alert GCP IAM Change.'
      );
    });

    it('builds an Azure narrative', () => {
      const text = buildCloudNarrative({
        cloud: { provider: ['azure'] },
        event: { action: ['UserLoggedIn'] },
        azure: {
          auditlogs: {
            properties: {
              initiated_by: { user: { user_principal_name: ['admin@corp.com'] } },
            },
          },
        },
        kibana: { alert: { severity: ['low'], rule: { name: ['Azure Sign-In'] } } },
      });

      expect(text).toBe(
        'azure event UserLoggedIn by admin@corp.com created low alert Azure Sign-In.'
      );
    });

    it('handles minimal cloud data', () => {
      expect(buildCloudNarrative({ cloud: { provider: ['aws'] } })).toBe('aws event');
    });

    it('builds a narrative with AWS error code', () => {
      const text = buildCloudNarrative({
        cloud: { provider: ['aws'] },
        event: { action: ['RunInstances'], outcome: ['failure'] },
        aws: {
          cloudtrail: {
            user_identity: { arn: ['arn:aws:iam::user/dev'] },
            error_code: ['UnauthorizedAccess'],
          },
        },
        kibana: {
          alert: { severity: ['high'], rule: { name: ['AWS Unauthorized API Call'] } },
        },
      });

      expect(text).toBe(
        'aws event RunInstances by arn:aws:iam::user/dev with result failure (error: UnauthorizedAccess) created high alert AWS Unauthorized API Call.'
      );
    });
  });
});
