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

export enum DatasetPrefix {
  Wiz = 'wiz',
  AWSSecurityHub = 'aws.securityhub',
  AWSInspector = 'aws.inspector',
  MicrosoftDefenderEndpoint = 'microsoft_defender_endpoint',
  MicrosoftDefenderCloud = 'microsoft_defender_cloud',
  M365Defender = 'm365_defender',
  GoogleSCC = 'google_scc',
  Tenable = 'tenable_io',
  QualysVMDR = 'qualys_vmdr',
  Rapid7InsightVM = 'rapid7_insightvm',
  ElasticCSP = 'cloud_security_posture',
}
interface Props {
  type: string;
  name?: string;
  style?: CSSInterpolation;
  size?: IconSize;
}

const getThirdPartyIconType = (type: string): string | undefined => {
  if (type.startsWith(DatasetPrefix.Wiz)) {
    return wiz;
  } else if (type.startsWith(DatasetPrefix.AWSSecurityHub)) {
    return awsSecurityHub;
  } else if (type.startsWith(DatasetPrefix.AWSInspector)) {
    return awsInspector;
  } else if (
    type.startsWith(DatasetPrefix.MicrosoftDefenderEndpoint) ||
    type.startsWith(DatasetPrefix.M365Defender) ||
    type.startsWith(DatasetPrefix.MicrosoftDefenderCloud)
  ) {
    return defender;
  } else if (type.startsWith(DatasetPrefix.GoogleSCC)) {
    return googleScc;
  } else if (type.startsWith(DatasetPrefix.Tenable)) {
    return tenable;
  } else if (type.startsWith(DatasetPrefix.QualysVMDR)) {
    return qualys;
  } else if (type.startsWith(DatasetPrefix.Rapid7InsightVM)) {
    return rapid7;
  } else if (type.startsWith(DatasetPrefix.ElasticCSP)) {
    return 'logoSecurity';
  } else {
    return undefined;
  }
};

const getThirdPartyIntegrationLabel = (type: string): string | undefined => {
  if (type.startsWith(DatasetPrefix.Wiz)) {
    return 'Wiz';
  } else if (type.startsWith(DatasetPrefix.AWSSecurityHub)) {
    return 'AWS Security Hub';
  } else if (type.startsWith(DatasetPrefix.AWSInspector)) {
    return 'AWS Inspector';
  } else if (type.startsWith(DatasetPrefix.M365Defender)) {
    return 'Microsoft 365 Defender';
  } else if (type.startsWith(DatasetPrefix.MicrosoftDefenderEndpoint)) {
    return 'Microsoft Defender for Endpoint';
  } else if (type.startsWith(DatasetPrefix.MicrosoftDefenderCloud)) {
    return 'Microsoft Defender for Cloud';
  } else if (type.startsWith(DatasetPrefix.GoogleSCC)) {
    return 'Google Security Command Center';
  } else if (type.startsWith(DatasetPrefix.Tenable)) {
    return 'Tenable';
  } else if (type.startsWith(DatasetPrefix.QualysVMDR)) {
    return 'Qualys';
  } else if (type.startsWith(DatasetPrefix.Rapid7InsightVM)) {
    return 'Rapid7';
  } else if (type.startsWith(DatasetPrefix.ElasticCSP)) {
    return 'Elastic Security';
  } else {
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

export const renderThirdPartyIcons = (integrations: string[], size: 's' | 'm' | 'l' = 'l') => {
  const visibleIcons = integrations.slice(0, MAX_ICONS);
  const hiddenIcons = integrations.slice(MAX_ICONS);
  const hiddenCount = hiddenIcons.length;

  const items = visibleIcons.map((integration) => (
    <EuiFlexItem key={integration} grow={false}>
      <EuiToolTip content={getThirdPartyIntegrationLabel(integration)}>
        <ThirdPartyIcon type={integration} size={size} />
      </EuiToolTip>
    </EuiFlexItem>
  ));

  if (integrations.length > MAX_ICONS) {
    const sortedHiddenLabels = hiddenIcons.map((id) => getThirdPartyIntegrationLabel(id)).sort();

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
