/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IconSize } from '@elastic/eui';
import { EuiBadge, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import type { CSSInterpolation } from '@emotion/serialize';
import awsInspector from '../assets/icons/third_party_icons/aws_inspector.svg';
import awsSecurityHub from '../assets/icons/third_party_icons/aws_security_hub.svg';
import wiz from '../assets/icons/third_party_icons/wiz.svg';
import defender from '../assets/icons/third_party_icons/defender.svg';
import tenable from '../assets/icons/third_party_icons/tenable_bright.svg';
import rapid7 from '../assets/icons/third_party_icons/rapid7.svg';
import qualys from '../assets/icons/third_party_icons/qualys.svg';
import googleScc from '../assets/icons/third_party_icons/google_scc.svg';

const MAX_ICONS = 2;

export type ThirdPartyIntegrationId =
  | 'wiz'
  | 'aws_security_hub'
  | 'aws_inspector'
  | 'microsoft_365_defender'
  | 'google_scc'
  | 'tenable'
  | 'qualys'
  | 'rapid7'
  | 'elastic';

interface Props {
  type: ThirdPartyIntegrationId;
  name?: string;
  style?: CSSInterpolation;
  size?: IconSize;
}

const getThirdPartyIconType = (type: ThirdPartyIntegrationId): string | undefined => {
  switch (type) {
    case 'wiz':
      return wiz; // Replace with actual icon reference
    case 'aws_security_hub':
      return awsSecurityHub;
    case 'aws_inspector':
      return awsInspector;
    case 'microsoft_365_defender':
      return defender;
    case 'google_scc':
      return googleScc; // Or a reference like googleCloudLogo
    case 'tenable':
      return tenable;
    case 'qualys':
      return qualys;
    case 'rapid7':
      return rapid7;
    case 'elastic':
      return 'logoSecurity';
    default:
      return undefined;
  }
};

export const ThirdPartyIcon = (props: Props) => {
  const iconType = getThirdPartyIconType(props.type);
  if (!iconType) return <></>;

  return (
    <EuiToolTip content={props.name}>
      <EuiIcon type={iconType} size={props.size || 'xl'} css={props.style} />
    </EuiToolTip>
  );
};

export const renderThirdPartyIcons = (
  integrations: ThirdPartyIntegrationId[],
  size: 's' | 'm' | 'l' = 'l' // Optional size parameter, defaults to 'm'
) => {
  const visibleIcons = integrations.slice(0, MAX_ICONS);
  const hiddenCount = integrations.length - visibleIcons.length;

  const items = visibleIcons.map((integration) => (
    <EuiFlexItem key={integration} grow={false}>
      <ThirdPartyIcon type={integration} size={size} />
    </EuiFlexItem>
  ));

  if (hiddenCount > 0) {
    items.push(
      <EuiFlexItem key="more-icons" grow={false}>
        <EuiBadge color="hollow">{`+${hiddenCount}`}</EuiBadge>
      </EuiFlexItem>
    );
  }

  return items;
};
