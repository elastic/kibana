/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { ExpandablePanel } from '../../../flyout/shared/components/expandable_panel';
import type { EntityDetailsPath } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import {
  useEndpointAssetData,
  getPostureLevelColor,
} from '../../../flyout/entity_details/endpoint_assets/hooks/use_endpoint_asset_data';
import { EndpointAssetsPreviewPanelKey } from '../../../flyout/entity_details/shared/constants';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';

const PostureScore = ({
  score,
  level,
}: {
  score: number;
  level?: string;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3 data-test-subj="endpointAssetsPostureScore">
              {score}%
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.endpointAssets.postureLabel"
              defaultMessage="Posture"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

interface EndpointAssetsPreviewProps {
  hostName: string;
  contextID: string;
  scopeId: string;
  isPreviewMode: boolean;
  openDetailsPanel: (path: EntityDetailsPath) => void;
}

export const EndpointAssetsPreview: React.FC<EndpointAssetsPreviewProps> = ({
  hostName,
  contextID,
  scopeId,
  isPreviewMode,
  openDetailsPanel,
}) => {
  const { euiTheme } = useEuiTheme();
  const { openPreviewPanel } = useExpandableFlyoutApi();
  const { data: assetData, isLoading, error } = useEndpointAssetData(hostName);

  const hasAssetData = useMemo(() => {
    return !error && assetData && (
      assetData.endpoint?.posture ||
      assetData.endpoint?.drift ||
      assetData.endpoint?.privileges
    );
  }, [assetData, error]);

  const postureScore = assetData?.endpoint?.posture?.score;
  const postureLevel = assetData?.endpoint?.posture?.level;
  const driftEvents = assetData?.endpoint?.drift?.total_events ?? 0;
  const adminCount = assetData?.endpoint?.privileges?.local_admins?.length ?? 0;

  const handleOpenEndpointAssetsPanel = useCallback(() => {
    openPreviewPanel({
      id: EndpointAssetsPreviewPanelKey,
      params: {
        hostName,
        contextID,
        scopeId,
        isPreviewMode: true,
      },
    });
  }, [openPreviewPanel, hostName, contextID, scopeId]);

  const link = useMemo(
    () => ({
      callback: handleOpenEndpointAssetsPanel,
      tooltip: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.insights.endpointAssets.tooltip"
          defaultMessage="View endpoint asset details"
        />
      ),
    }),
    [handleOpenEndpointAssetsPanel]
  );

  // Build distribution bar stats
  const stats = useMemo(() => {
    const items = [];

    if (postureScore !== undefined) {
      // Show passing vs failing controls
      const passing = Math.round(postureScore);
      const failing = 100 - passing;
      items.push({
        key: 'Passing',
        count: passing,
        color: euiTheme.colors.success,
      });
      if (failing > 0) {
        items.push({
          key: 'Failing',
          count: failing,
          color: euiTheme.colors.danger,
        });
      }
    }

    return items;
  }, [postureScore, euiTheme]);

  if (isLoading || !hasAssetData) {
    return null;
  }

  return (
    <ExpandablePanel
      header={{
        iconType: !isPreviewMode && hasAssetData ? 'arrowStart' : '',
        title: (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText
                size="xs"
                css={{
                  fontWeight: euiTheme.font.weight.bold,
                }}
              >
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.insights.endpointAssets.title"
                  defaultMessage="Endpoint Assets"
                />
              </EuiText>
            </EuiFlexItem>
            {postureLevel && (
              <EuiFlexItem grow={false}>
                <EuiBadge color={getPostureLevelColor(postureLevel)}>
                  {postureLevel}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
        link: hasAssetData ? link : undefined,
      }}
      data-test-subj="securitySolutionFlyoutInsightsEndpointAssets"
    >
      <EuiFlexGroup gutterSize="m">
        {postureScore !== undefined && (
          <PostureScore score={postureScore} level={postureLevel} />
        )}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3 data-test-subj="endpointAssetsDriftCount">{driftEvents}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText
                size="xs"
                css={css`
                  font-weight: ${euiTheme.font.weight.semiBold};
                `}
              >
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.insights.endpointAssets.driftLabel"
                  defaultMessage="Drift Events"
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3 data-test-subj="endpointAssetsAdminCount">{adminCount}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText
                size="xs"
                css={css`
                  font-weight: ${euiTheme.font.weight.semiBold};
                `}
              >
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.insights.endpointAssets.adminsLabel"
                  defaultMessage="Local Admins"
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {stats.length > 0 && (
          <EuiFlexItem grow={2}>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem />
              <EuiFlexItem>
                <EuiSpacer />
                <DistributionBar
                  stats={stats}
                  data-test-subj="EndpointAssetsDistributionBarTestId"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};
