/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiPopover, EuiButtonEmpty, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';

const INTEGRATIONS: Record<InventoryItemType, { label: string; documentation: string }> = {
  host: {
    label: i18n.translate('xpack.infra.supportedDataPopover.hostIntegrationInfo', {
      defaultMessage:
        'This view supports data from the OpenTelemetry and Elastic System Integration.',
    }),
    documentation: 'https://ela.st/infra-inventory-supported-data-hosts',
  },
  pod: {
    label: i18n.translate('xpack.infra.supportedDataPopover.kubernetesIntegrationInfo', {
      defaultMessage: 'This view supports data from the Kubernetes Integration.',
    }),
    documentation: 'https://ela.st/infra-inventory-supported-data-k8s-pods',
  },
  container: {
    label: i18n.translate('xpack.infra.supportedDataPopover.dockerContainerIntegrationInfo', {
      defaultMessage:
        'This view supports data from the Kubernetes, System and Docker Integrations.',
    }),
    documentation: 'https://ela.st/infra-inventory-supported-data-containers',
  },
  awsEC2: {
    label: i18n.translate('xpack.infra.supportedDataPopover.awsEC2IntegrationInfo', {
      defaultMessage: 'This view supports data from the AWS EC2 Integration.',
    }),
    documentation: 'https://ela.st/infra-inventory-supported-data-aws-ec2',
  },
  awsRDS: {
    label: i18n.translate('xpack.infra.supportedDataPopover.awsRDSIntegrationInfo', {
      defaultMessage: 'This view supports data from the AWS RDS Integration.',
    }),
    documentation: 'https://ela.st/infra-inventory-supported-data-aws-rds',
  },
  awsS3: {
    label: i18n.translate('xpack.infra.supportedDataPopover.awsS3IntegrationInfo', {
      defaultMessage: 'This view supports data from the AWS S3 Integration.',
    }),
    documentation: 'https://ela.st/infra-inventory-supported-data-aws-s3',
  },
  awsSQS: {
    label: i18n.translate('xpack.infra.supportedDataPopover.awsSQSIntegrationInfo', {
      defaultMessage: 'This view supports data from the AWS SQS Integration.',
    }),
    documentation: 'https://ela.st/infra-inventory-supported-data-aws-sqs',
  },
} as const;

export function SupportedDataPopover({ nodeType }: { nodeType: InventoryItemType }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          size="s"
          data-test-subj="infraSupportedDataPopoverButton"
          onClick={() => setIsOpen(true)}
        >
          {i18n.translate('xpack.infra.supportedDataPopover.buttonLabel', {
            defaultMessage: 'What data is supported?',
          })}
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
    >
      <EuiText size="s">
        {INTEGRATIONS[nodeType].label}
        <br />
        <br />
        <FormattedMessage
          id="xpack.infra.supportedDataPopover.seeDocumentationLink"
          defaultMessage="See {documentation} for more information."
          values={{
            documentation: (
              <EuiLink
                data-test-subj="infraSupportedDataPopoverDocumentationLink"
                href={INTEGRATIONS[nodeType].documentation}
              >
                <FormattedMessage
                  id="xpack.infra.supportedDataPopover.documentationLink"
                  defaultMessage="documentation"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </EuiPopover>
  );
}
