/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiTitle,
  EuiButtonIcon,
  EuiText,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiSkeletonText,
} from '@elastic/eui';

export interface HomePageStatPanelMetric {
  key: string;
  label: string;
  value: string;
  isLoading: boolean;
}

export interface HomePageStatPanelProps {
  iconType: string;
  title: string;
  onTitleClick: () => void;
  testSubj: string;
  metrics: HomePageStatPanelMetric[];
}

export const HomePageStatPanel = ({
  iconType,
  title,
  onTitleClick,
  testSubj,
  metrics,
}: HomePageStatPanelProps) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj={testSubj}>
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={iconType} size="m" />
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiTitle size="xxs">
          <h3>
            {/* <EuiLink onClick={onTitleClick}>{title}</EuiLink> */}
            {title}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="gear"
          onClick={onTitleClick}
          size="s"
          color="text"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="m" />
    <EuiFlexGroup gutterSize="l" responsive={false} justifyContent="spaceBetween">
      {metrics.map(({ key, label, value, isLoading }) => (
        <EuiFlexItem key={key} grow>
          <EuiStat
            title={isLoading ? <EuiSkeletonText size="m" lines={1} /> : value}
            titleColor="text"
            description={
              <>
                <EuiText size="s" color="subdued">{label}</EuiText>
                <EuiSpacer size="xs" />
              </>
            }
            descriptionElement="p"
            titleSize="m"
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
    <EuiSpacer size="xs" />
  </EuiPanel>
);
