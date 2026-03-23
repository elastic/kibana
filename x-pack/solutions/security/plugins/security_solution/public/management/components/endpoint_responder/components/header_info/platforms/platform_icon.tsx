/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, type EuiIconProps } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { SupportedHostOsType } from '../../../../../../../common/endpoint/constants';
import linuxSvg from './logos/linux.svg';
import windowsSvg from './logos/windows.svg';
import macosSvg from './logos/macos.svg';

export type Platform = SupportedHostOsType;

const getPlatformIcon = (platform: Platform): string | null => {
  switch (platform) {
    case 'macos':
      return macosSvg;
    case 'linux':
      return linuxSvg;
    case 'windows':
      return windowsSvg;
    default:
      return null;
  }
};

export interface PlatformIconProps {
  platform: Platform;
  size?: EuiIconProps['size'];
  'data-test-subj'?: string;
}

// FIXME:PT move this component to `public/common/components/endpoint`

export const PlatformIcon = memo<PlatformIconProps>(
  ({ platform, size = 'xl', 'data-test-subj': dataTestSubj }) => {
    const platformIcon = useMemo(() => getPlatformIcon(platform), [platform]);
    const iconTitle = useMemo(() => {
      return !platformIcon
        ? i18n.translate('xpack.securitySolution.platformIcon.platformIconTitle', {
            defaultMessage: 'Unable to determine host platform type',
          })
        : platform;
    }, [platform, platformIcon]);

    return (
      <EuiIcon
        type={!platformIcon ? 'desktop' : platformIcon}
        title={iconTitle}
        size={size}
        data-test-subj={dataTestSubj}
      />
    );
  }
);

PlatformIcon.displayName = 'PlatformIcon';
