/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiAvatarProps, EuiIconProps } from '@elastic/eui';
import { EuiAvatar, EuiIcon, useEuiTheme } from '@elastic/eui';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';

const SUPPORTED_LOGOS = [
  'aws',
  'aws_ecs',
  'azure',
  'docker',
  'dotnet',
  'prometheus',
  'gcp',
  'java',
  'javascript',
  'kubernetes',
  'nginx',
  'apache',
  'system',
  'opentelemetry',
  'mysql',
  'postgresql',
  'redis',
  'ruby',
  'haproxy',
  'rabbitmq',
  'kafka',
  'mongodb',
  'apache_tomcat',
  'couchbase',
  'logstash',
  'firehose',
  'fluentbit',
  'linux',
  'windows',
  'apple_black',
  'apple_white',
  'slack',
  'jira',
  'confluence',
  'salesforce',
  'splunk',
] as const;

export type SupportedLogo = (typeof SUPPORTED_LOGOS)[number];

export function isSupportedLogo(logo: string): logo is SupportedLogo {
  return (SUPPORTED_LOGOS as readonly string[]).includes(logo);
}

// Logos that EUI ships natively. Anything not listed here falls through to a
// bundled SVG asset served from the plugin's `public/assets/` folder.
const EUI_LOGO_BY_BRAND: Partial<Record<SupportedLogo, string>> = {
  aws: 'logoAWS',
  azure: 'logoAzure',
  gcp: 'logoGCP',
  kubernetes: 'logoKubernetes',
  nginx: 'logoNginx',
  prometheus: 'logoPrometheus',
  docker: 'logoDocker',
  windows: 'logoWindows',
  slack: 'logoSlack',
  apache: 'logoApache',
  mysql: 'logoMySQL',
  redis: 'logoRedis',
  rabbitmq: 'logoRabbitmq',
  couchbase: 'logoCouchbase',
  logstash: 'logoLogstash',
};

function useIconForLogo(logo?: SupportedLogo): string | undefined {
  const {
    services: { http },
  } = useKibana();
  if (!logo) return undefined;
  return EUI_LOGO_BY_BRAND[logo] ?? http?.staticAssets.getPluginAssetHref(`${logo}.svg`);
}

type LogoIconSizeProp = EuiIconProps['size'] | EuiAvatarProps['size'] | undefined;

export interface LogoIconProps {
  logo?: SupportedLogo;
  euiIconType?: EuiIconType;
  isAvatar?: boolean;
  size?: LogoIconSizeProp;
  className?: string;
  type?: EuiAvatarProps['type'];
  hasBorder?: boolean;
  color?: EuiAvatarProps['color'];
}

function isAvatarSize(size: LogoIconSizeProp): size is EuiAvatarProps['size'] {
  return size !== 'original' && size !== 'xxl';
}

export function LogoIcon({
  logo,
  euiIconType,
  isAvatar,
  size,
  className,
  type,
  hasBorder,
  color = 'subdued',
}: LogoIconProps) {
  const iconType = useIconForLogo(logo);
  const resolvedIconType = euiIconType ?? iconType;
  const { euiTheme } = useEuiTheme();
  if (resolvedIconType && isAvatar && isAvatarSize(size)) {
    return (
      <EuiAvatar
        color={color}
        iconType={resolvedIconType}
        name="logoIcon"
        size={size}
        type={type}
        className={className}
        aria-hidden={true}
        css={
          hasBorder
            ? css`
                border: ${euiTheme.border.thin};
              `
            : undefined
        }
      />
    );
  }
  if (resolvedIconType) {
    return <EuiIcon type={resolvedIconType} size={size} className={className} aria-hidden={true} />;
  }
  return null;
}
