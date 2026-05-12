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

export type SupportedLogo =
  | 'aws'
  | 'aws_ecs'
  | 'azure'
  | 'docker'
  | 'dotnet'
  | 'prometheus'
  | 'gcp'
  | 'java'
  | 'javascript'
  | 'kubernetes'
  | 'nginx'
  | 'apache'
  | 'system'
  | 'opentelemetry'
  | 'mysql'
  | 'postgresql'
  | 'redis'
  | 'ruby'
  | 'haproxy'
  | 'rabbitmq'
  | 'kafka'
  | 'mongodb'
  | 'apache_tomcat'
  | 'firehose'
  | 'fluentbit'
  | 'linux'
  | 'windows'
  | 'apple_black'
  | 'apple_white';

export function isSupportedLogo(logo: string): logo is SupportedLogo {
  return [
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
    'system',
    'apache',
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
    'fluentbit',
    'linux',
    'windows',
    'apple',
  ].includes(logo);
}

function useIconForLogo(logo?: SupportedLogo): string | undefined {
  const {
    services: { http },
  } = useKibana();
  if (!logo) return undefined;
  switch (logo) {
    case 'aws':
      return 'logoAWS';
    case 'azure':
      return 'logoAzure';
    case 'gcp':
      return 'logoGCP';
    case 'kubernetes':
      return 'logoKubernetes';
    case 'nginx':
      return 'logoNginx';
    case 'prometheus':
      return 'logoPrometheus';
    case 'docker':
      return 'logoDocker';
    case 'windows':
      return 'logoWindows';
    default:
      return http?.staticAssets.getPluginAssetHref(`${logo}.svg`);
  }
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
    return <EuiIcon type={resolvedIconType} size={size} className={className} />;
  }
  return null;
}
