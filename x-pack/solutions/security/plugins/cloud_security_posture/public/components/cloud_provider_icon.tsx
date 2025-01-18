/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiToolTip, IconSize } from '@elastic/eui';
import { CSSInterpolation } from '@emotion/serialize';
import { getCloudProviderNameFromAbbreviation } from '../../common/utils/helpers';
import googleCloudLogo from '../assets/icons/google_cloud_logo.svg';

interface Props {
  cloudProvider: string;
  style?: CSSInterpolation;
  size?: IconSize;
}

const getCloudProviderIcon = (cloudProvider: string) => {
  switch (cloudProvider.toLowerCase()) {
    case 'azure':
      return 'logoAzure';
    case 'aws':
      return 'logoAWS';
    case 'gcp':
      return googleCloudLogo;
    default:
      return undefined;
  }
};

export const CloudProviderIcon = ({ cloudProvider, size, style }: Props) => {
  const iconType = getCloudProviderIcon(cloudProvider);

  if (!iconType) {
    return null;
  }

  const name = getCloudProviderNameFromAbbreviation(cloudProvider);

  return (
    <EuiToolTip content={name}>
      <EuiIcon type={iconType} size={size || 'xl'} css={style} />
    </EuiToolTip>
  );
};
