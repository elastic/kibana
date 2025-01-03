/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiText, EuiIconTip, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { css } from '@emotion/react';
import { ProgressIndicator } from '../shared/progress_indicator';

const SUPPORTED_SERVICES = [
  'API Gateway',
  'AWS Usage',
  'CloudTrail',
  'DynamoDB',
  'EBS',
  'EC2',
  'ECS',
  'ELB',
  'EMR',
  'Kinesis Data Stream',
  'Lambda',
  'MSK',
  'NAT Gateway',
  'RDS',
  'Route53',
  'S3',
  'SNS',
  'SQS',
  'VPC',
  'VPN',
];

export function ProgressCallout() {
  return (
    <ProgressIndicator
      data-test-subj="observabilityOnboardingFirehoseProgressCallout"
      title={
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiText>
            <p>
              {i18n.translate('xpack.observability_onboarding.firehosePanel.waitingForDataTitle', {
                defaultMessage: 'Retrieving data from Amazon Data Firehose',
              })}
            </p>
          </EuiText>
          <EuiIconTip
            content={
              <EuiText size="s">
                <strong>
                  {i18n.translate(
                    'xpack.observability_onboarding.progressCallout.strong.allServicesWeCanLabel',
                    { defaultMessage: 'All services we can detect' }
                  )}
                </strong>
                <EuiHorizontalRule margin="xs" />
                <ul>
                  {SUPPORTED_SERVICES.map((service) => (
                    <li key={service}>{service}</li>
                  ))}
                  <li>
                    {i18n.translate(
                      'xpack.observability_onboarding.progressCallout.li.otherLabel',
                      {
                        defaultMessage:
                          'Other (Unsupported logs will be stored in a generic Firehose index).',
                      }
                    )}
                  </li>
                </ul>
              </EuiText>
            }
            position="top"
            type="iInCircle"
          />
        </EuiFlexGroup>
      }
      isLoading={true}
      css={css`
        display: inline-block;
      `}
    />
  );
}
