/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IconType } from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import dockerIconSrc from '../../../assets/docker.svg';

const SUPPORTED_INTEGRATIONS_LIST = [
  'Apache',
  'Docker',
  'Nginx',
  'System',
  'MySQL',
  'PostgreSQL',
  'Redis',
  'Haproxy',
  'Kafka',
  'RabbitMQ',
  'Prometheus',
  'Apache Tomcat',
  'MongoDB',
] as const;

type SupportedIntegrationName = (typeof SUPPORTED_INTEGRATIONS_LIST)[number];

interface SupportedIntegrationItem {
  title: SupportedIntegrationName;
  icon: IconType;
}

const FEATURED_INTEGRATIONS_LIST: SupportedIntegrationItem[] = [
  { title: 'Apache', icon: 'logoApache' },
  { title: 'Docker', icon: dockerIconSrc },
  { title: 'Nginx', icon: 'logoNginx' },
  { title: 'MySQL', icon: 'logoMySQL' },
  { title: 'System', icon: 'display' },
];

export function SupportedIntegrationsList() {
  const {
    euiTheme: { colors },
  } = useEuiTheme();
  const customLogFilesTitle = i18n.translate(
    'xpack.observability_onboarding.autoDetectPanel.supportedIntegrationsList.customIntegrationTitle',
    { defaultMessage: 'Custom .log files' }
  );
  return (
    <EuiFlexGroup gutterSize="s" responsive={false} css={{ flexWrap: 'wrap' }}>
      {FEATURED_INTEGRATIONS_LIST.map(({ title, icon }) => (
        <EuiFlexItem key={title} grow={false}>
          <EuiBadge iconType={icon} color="hollow">
            {title}
          </EuiBadge>
        </EuiFlexItem>
      ))}

      <EuiBadge iconType="documents" color="hollow">
        {customLogFilesTitle}
      </EuiBadge>

      <EuiToolTip
        content={
          <EuiText size="s">
            <ul>
              {SUPPORTED_INTEGRATIONS_LIST.map((integration) => (
                <li key={integration}>{integration}</li>
              ))}
              <li>{customLogFilesTitle}</li>
            </ul>
          </EuiText>
        }
      >
        <EuiBadge color="hollow" tabIndex={0}>
          <EuiTextColor color={colors.link}>
            {`+${SUPPORTED_INTEGRATIONS_LIST.length - FEATURED_INTEGRATIONS_LIST.length}`}
          </EuiTextColor>
        </EuiBadge>
      </EuiToolTip>
    </EuiFlexGroup>
  );
}
