/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiToolTip, IconSize } from '@elastic/eui';
import { CSSInterpolation } from '@emotion/serialize';
import type { BenchmarkId } from '../../common/types_old';
import cisEksIcon from '../assets/icons/cis_eks_logo.svg';
import googleCloudLogo from '../assets/icons/google_cloud_logo.svg';

interface Props {
  type: BenchmarkId;
  name?: string;
  style?: CSSInterpolation;
  size?: IconSize;
}

const getBenchmarkIdIconType = (type: BenchmarkId): string | undefined => {
  switch (type) {
    case 'cis_eks':
      return cisEksIcon;
    case 'cis_azure':
      return 'logoAzure';
    case 'cis_aws':
      return 'logoAWS';
    case 'cis_gcp':
      return googleCloudLogo;
    case 'cis_k8s':
      return 'logoKubernetes';
  }
};

export const CISBenchmarkIcon = (props: Props) => {
  const iconType = getBenchmarkIdIconType(props.type);
  if (!iconType) return <></>;

  return (
    <EuiToolTip content={props.name}>
      <EuiIcon type={iconType} size={props.size || 'xl'} css={props.style} />
    </EuiToolTip>
  );
};
