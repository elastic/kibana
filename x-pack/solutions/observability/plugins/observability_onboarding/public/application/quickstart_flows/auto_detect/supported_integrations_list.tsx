/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiToolTip,
  IconType,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import apacheIconSrc from '../../../assets/apache.svg';
import dockerIconSrc from '../../../assets/docker.svg';
import nginxIconSrc from '../../../assets/nginx.svg';
import mysqlIconSrc from '../../../assets/mysql.svg';

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
  { title: 'Apache', icon: apacheIconSrc },
  { title: 'Docker', icon: dockerIconSrc },
  { title: 'Nginx', icon: nginxIconSrc },
  { title: 'MySQL', icon: mysqlIconSrc },
  { title: 'System', icon: 'desktop' },
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
        <EuiFlexItem grow={false}>
          <EuiBadge iconType={icon} color="hollow" key={title}>
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
        <EuiBadge color="hollow">
          <EuiTextColor color={colors.link}>
            {`+${SUPPORTED_INTEGRATIONS_LIST.length - FEATURED_INTEGRATIONS_LIST.length}`}
          </EuiTextColor>
        </EuiBadge>
      </EuiToolTip>
    </EuiFlexGroup>
  );
}
