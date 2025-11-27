/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';

export const INTEGRATIONS: Record<InventoryItemType, { label: string; documentation: string }> = {
  host: {
    label: i18n.translate('xpack.infra.supportedDataTooltipLink.hostIntegrationInfo', {
      defaultMessage:
        'This view supports data from the OpenTelemetry and Elastic System Integration.',
    }),
    documentation: 'https://ela.st/infra-inventory-supported-data-hosts',
  },
  pod: {
    label: i18n.translate('xpack.infra.supportedDataTooltipLink.kubernetesIntegrationInfo', {
      defaultMessage: 'This view supports data from the Kubernetes Integration.',
    }),
    documentation: 'https://ela.st/infra-inventory-supported-data-k8s-pods',
  },
  container: {
    label: i18n.translate('xpack.infra.supportedDataTooltipLink.dockerContainerIntegrationInfo', {
      defaultMessage:
        'This view supports data from the Kubernetes, System and Docker Integrations.',
    }),
    documentation: 'https://ela.st/infra-inventory-supported-data-containers',
  },
  awsEC2: {
    label: i18n.translate('xpack.infra.supportedDataTooltipLink.awsEC2IntegrationInfo', {
      defaultMessage: 'This view supports data from the AWS EC2 Integration.',
    }),
    documentation: 'https://ela.st/infra-inventory-supported-data-aws-ec2',
  },
  awsRDS: {
    label: i18n.translate('xpack.infra.supportedDataTooltipLink.awsRDSIntegrationInfo', {
      defaultMessage: 'This view supports data from the AWS RDS Integration.',
    }),
    documentation: 'https://ela.st/infra-inventory-supported-data-aws-rds',
  },
  awsS3: {
    label: i18n.translate('xpack.infra.supportedDataTooltipLink.awsS3IntegrationInfo', {
      defaultMessage: 'This view supports data from the AWS S3 Integration.',
    }),
    documentation: 'https://ela.st/infra-inventory-supported-data-aws-s3',
  },
  awsSQS: {
    label: i18n.translate('xpack.infra.supportedDataTooltipLink.awsSQSIntegrationInfo', {
      defaultMessage: 'This view supports data from the AWS SQS Integration.',
    }),
    documentation: 'https://ela.st/infra-inventory-supported-data-aws-sqs',
  },
} as const;

export function SupportedDataTooltipLink({ nodeType }: { nodeType: InventoryItemType }) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiToolTip content={INTEGRATIONS[nodeType].label}>
      <EuiLink
        data-test-subj="infraSupportedDataTooltipLink"
        href={INTEGRATIONS[nodeType].documentation}
        target="_blank"
        external
        css={{
          height: euiTheme.size.xl,
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {i18n.translate('xpack.infra.supportedDataTooltipLink.label', {
          defaultMessage: 'What data is supported?',
        })}
      </EuiLink>
    </EuiToolTip>
  );
}
