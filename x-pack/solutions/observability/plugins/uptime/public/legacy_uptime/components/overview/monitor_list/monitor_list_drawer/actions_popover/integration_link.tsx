/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiIconTip } from '@elastic/eui';

interface IntegrationLinkProps {
  ariaLabel: string;
  href: string | undefined;
  iconType: 'apmApp' | 'metricsApp' | 'logsApp';
  message: string;
  tooltipContent: string;
}

export const IntegrationLink = ({
  ariaLabel,
  href,
  iconType,
  message,
  tooltipContent,
}: IntegrationLinkProps) =>
  typeof href === 'undefined' ? (
    <EuiFlexGroup responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          content={i18n.translate('xpack.uptime.integrationLink.missingDataMessage', {
            defaultMessage: 'Required data for this integration was not found.',
          })}
          type={iconType}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued">{message}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <EuiLink data-test-subj="syntheticsIntegrationLinkLink" aria-label={ariaLabel} href={href}>
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIconTip content={tooltipContent} position="top" type={iconType} />
        </EuiFlexItem>
        <EuiFlexItem>{message}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiLink>
  );
