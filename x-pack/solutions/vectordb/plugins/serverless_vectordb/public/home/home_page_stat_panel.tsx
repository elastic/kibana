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
  EuiIconTip,
  EuiLink,
  EuiButtonIcon,
  EuiText,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiSkeletonText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { titleLinkContentStyle } from './home_page_stat_panel.styles';

export interface HomePageStatPanelMetric {
  key: string;
  label: string;
  value: string;
  isLoading: boolean;
  tooltip?: string;
}

export interface HomePageStatPanelProps {
  iconType: string;
  title: string;
  onTitleClick?: () => void;
  testSubj: string;
  metrics: HomePageStatPanelMetric[];
}

export const HomePageStatPanel = ({
  iconType,
  title,
  onTitleClick,
  testSubj,
  metrics,
}: HomePageStatPanelProps) => {
  const managePanelAriaLabel = i18n.translate(
    'xpack.serverlessVectorDb.homePage.statPanel.managePanelButtonLabel',
    {
      defaultMessage: 'Manage {title}',
      values: { title },
    }
  );

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={testSubj}>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiIcon type={iconType} size="m" aria-hidden={true} />
          <EuiLink onClick={onTitleClick} color="text">
            <span css={titleLinkContentStyle}>
              <span>{title}</span>
              <EuiIcon type="sortRight" size="m" aria-hidden={true} />
            </span>
          </EuiLink>
        </EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={managePanelAriaLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="gear"
              aria-label={managePanelAriaLabel}
              onClick={onTitleClick}
              size="s"
              color="text"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="l" responsive={false} justifyContent="spaceBetween">
        {metrics.map(({ key, label, value, isLoading, tooltip }) => (
          <EuiFlexItem key={key} grow>
            <EuiStat
              title={isLoading ? <EuiSkeletonText size="m" lines={1} /> : value}
              titleColor="text"
              description={
                <>
                  <EuiText size="s" color="subdued">
                    {label}
                    {tooltip && (
                      <>
                        {' '}
                        <EuiIconTip content={tooltip} type="info" color="subdued" />
                      </>
                    )}
                  </EuiText>
                  <EuiSpacer size="xs" />
                </>
              }
              descriptionElement="div"
              titleSize="s"
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
    </EuiPanel>
  );
};
