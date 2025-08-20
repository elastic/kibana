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
  | 'Wiz'
  | 'aws_security_hub'
  | 'aws_inspector'
  | 'Microsoft'
  | 'Google Security Command Center'
  | 'Tenable'
  | 'Qualys VMDR'
  | 'Rapid7'
  | 'Elastic';

const INTEGRATION_LABELS: Record<ThirdPartyIntegrationId, string> = {
  Wiz: 'Wiz',
  aws_security_hub: 'AWS Security Hub',
  aws_inspector: 'AWS Inspector',
  Microsoft: 'Microsoft 365 Defender',
  'Google Security Command Center': 'Google Security Command Center',
  Tenable: 'Tenable',
  'Qualys VMDR': 'Qualys',
  Rapid7: 'Rapid7',
  Elastic: 'Elastic Security',
};

interface Props {
  type: ThirdPartyIntegrationId;
  name?: string;
  style?: CSSInterpolation;
  size?: IconSize;
}

const getThirdPartyIconType = (type: ThirdPartyIntegrationId): string | undefined => {
  switch (type) {
    case 'Wiz':
      return wiz; // Replace with actual icon reference
    case 'aws_security_hub':
      return awsSecurityHub;
    case 'aws_inspector':
      return awsInspector;
    case 'Microsoft':
      return defender;
    case 'Google Security Command Center':
      return googleScc; // Or a reference like googleCloudLogo
    case 'Tenable':
      return tenable;
    case 'Qualys VMDR':
      return qualys;
    case 'Rapid7':
      return rapid7;
    case 'Elastic':
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
  size: 's' | 'm' | 'l' = 'l'
) => {
  const visibleIcons = integrations.slice(0, MAX_ICONS);
  const hiddenIcons = integrations.slice(MAX_ICONS);
  const hiddenCount = hiddenIcons.length;

  const items = visibleIcons.map((integration) => (
    <EuiFlexItem key={integration} grow={false}>
      <EuiToolTip content={INTEGRATION_LABELS[integration] || integration}>
        <ThirdPartyIcon type={integration} size={size} />
      </EuiToolTip>
    </EuiFlexItem>
  ));

  if (integrations.length > MAX_ICONS) {
    const sortedHiddenLabels = hiddenIcons.map((id) => INTEGRATION_LABELS[id] || id).sort();

    const tooltipContent = (
      <>
        {sortedHiddenLabels.map((label, index) => (
          <div key={index}>{label}</div>
        ))}
      </>
    );

    items.push(
      <EuiFlexItem key="more-icons" grow={false}>
        <EuiToolTip content={tooltipContent}>
          <EuiBadge color="hollow">{`+${hiddenCount}`}</EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
    );
  }

  return items;
};
