/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  areAllServiceIntegrationConfigsComplete,
  getIntegrationConfigFieldsForService,
  isServiceIntegrationConfigComplete,
} from './aws_integration_service_config';

describe('aws_integration_service_config', () => {
  it('returns GuardDuty detector and region fields from override', () => {
    const fields = getIntegrationConfigFieldsForService('guardduty');
    expect(fields.map((field) => field.key)).toEqual(['guardduty_detector_id', 'regions']);
  });

  it('returns Inspector region field from override', () => {
    const fields = getIntegrationConfigFieldsForService('inspector');
    expect(fields).toHaveLength(1);
    expect(fields[0]?.key).toBe('regions');
  });

  it('omits regions-only agentless metrics services', () => {
    expect(getIntegrationConfigFieldsForService('dynamodb')).toEqual([]);
  });

  it('includes CloudWatch log group for log integrations', () => {
    const fields = getIntegrationConfigFieldsForService('cloudwatch_logs');
    expect(fields.map((field) => field.key)).toEqual(['cloudwatch_log_group', 'regions']);
  });

  it('validates require-one-of groups for S3 log sources', () => {
    const serviceIds = new Set(['apigateway_logs']);
    expect(
      areAllServiceIntegrationConfigsComplete({
        serviceIds,
        values: { apigateway_logs: { regions: 'us-east-1' } },
      })
    ).toBe(false);
    expect(
      areAllServiceIntegrationConfigsComplete({
        serviceIds,
        values: {
          apigateway_logs: { regions: 'us-east-1', s3_bucket_arn: 'arn:aws:s3:::logs' },
        },
      })
    ).toBe(true);
  });

  it('requires GuardDuty detector id', () => {
    expect(
      isServiceIntegrationConfigComplete('guardduty', { regions: 'us-east-1' })
    ).toBe(false);
    expect(
      isServiceIntegrationConfigComplete('guardduty', {
        guardduty_detector_id: 'abc',
        regions: 'us-east-1',
      })
    ).toBe(true);
  });
});
