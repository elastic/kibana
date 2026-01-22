/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, useEuiTheme } from '@elastic/eui';
import type { SoftwareType } from '../../../common/endpoint_assets';

interface SoftwareSummaryCardsProps {
  installedCount?: number;
  servicesCount?: number;
  typeFilter?: SoftwareType | 'all';
  onTypeFilterChange?: (type: SoftwareType | 'all') => void;
}

const ALL_LABEL = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareSummary.allLabel',
  {
    defaultMessage: 'All Software',
  }
);

const INSTALLED_APPS_LABEL = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareSummary.installedAppsLabel',
  {
    defaultMessage: 'Applications',
  }
);

const SERVICES_LABEL = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareSummary.servicesLabel',
  {
    defaultMessage: 'Services',
  }
);

export const SoftwareSummaryCards: React.FC<SoftwareSummaryCardsProps> = React.memo(
  ({ installedCount, servicesCount, typeFilter = 'all', onTypeFilterChange }) => {
    const { euiTheme } = useEuiTheme();

    const totalSoftware = useMemo(() => {
      return (installedCount ?? 0) + (servicesCount ?? 0);
    }, [installedCount, servicesCount]);

    const handleAllClick = useCallback(() => {
      onTypeFilterChange?.('all');
    }, [onTypeFilterChange]);

    const handleAppsClick = useCallback(() => {
      onTypeFilterChange?.('application');
    }, [onTypeFilterChange]);

    const handleServicesClick = useCallback(() => {
      onTypeFilterChange?.('service');
    }, [onTypeFilterChange]);

    const cardStyle = css`
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      &:hover {
        transform: translateY(-2px);
        box-shadow: ${euiTheme.levels.menu};
      }
    `;

    const selectedCardStyle = css`
      ${cardStyle}
      border: 2px solid ${euiTheme.colors.primary};
      background-color: ${euiTheme.colors.lightestShade};
    `;

    return (
      <EuiFlexGroup gutterSize="m" wrap>
        <EuiFlexItem grow={1} style={{ minWidth: '150px' }}>
          <EuiPanel
            hasBorder
            css={typeFilter === 'all' ? selectedCardStyle : cardStyle}
            onClick={handleAllClick}
            paddingSize="m"
          >
            <EuiStat
              title={totalSoftware}
              description={ALL_LABEL}
              titleSize="m"
              titleColor={typeFilter === 'all' ? 'primary' : 'default'}
              descriptionElement="span"
            />
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem grow={1} style={{ minWidth: '150px' }}>
          <EuiPanel
            hasBorder
            css={typeFilter === 'application' ? selectedCardStyle : cardStyle}
            onClick={handleAppsClick}
            paddingSize="m"
          >
            <EuiStat
              title={installedCount ?? 0}
              description={INSTALLED_APPS_LABEL}
              titleSize="m"
              titleColor={typeFilter === 'application' ? 'primary' : 'default'}
              descriptionElement="span"
            />
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem grow={1} style={{ minWidth: '150px' }}>
          <EuiPanel
            hasBorder
            css={typeFilter === 'service' ? selectedCardStyle : cardStyle}
            onClick={handleServicesClick}
            paddingSize="m"
          >
            <EuiStat
              title={servicesCount ?? 0}
              description={SERVICES_LABEL}
              titleSize="m"
              titleColor={typeFilter === 'service' ? 'primary' : 'default'}
              descriptionElement="span"
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

SoftwareSummaryCards.displayName = 'SoftwareSummaryCards';
