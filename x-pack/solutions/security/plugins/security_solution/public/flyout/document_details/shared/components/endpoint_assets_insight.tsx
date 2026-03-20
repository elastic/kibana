/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSkeletonText,
} from '@elastic/eui';
import { InsightsSummaryRow } from '../../right/components/insights_summary_row';
import { useEndpointAssetData, getPostureLevelColor } from '../../../entity_details/endpoint_assets/hooks/use_endpoint_asset_data';
import type { EntityDetailsPath } from '../../../entity_details/shared/components/left_panel/left_panel_header';
import { EntityDetailsLeftPanelTab } from '../../../entity_details/shared/components/left_panel/left_panel_header';

const ENDPOINT_ASSETS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.endpointAssets.title',
  { defaultMessage: 'Endpoint Assets' }
);

const ENDPOINT_ASSETS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.endpointAssets.description',
  { defaultMessage: 'View endpoint posture, drift, and privileges' }
);

const POSTURE_SCORE_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.endpointAssets.postureScore',
  { defaultMessage: 'Posture' }
);

export const ENDPOINT_ASSETS_INSIGHT_TEST_ID = 'endpoint-assets-insight';

interface EndpointAssetsInsightProps {
  hostName: string;
  openDetailsPanel: (path: EntityDetailsPath) => void;
  'data-test-subj'?: string;
}

/**
 * Insight component that shows endpoint asset data availability
 * and opens the Endpoint Assets tab in the left panel when clicked
 */
export const EndpointAssetsInsight: React.FC<EndpointAssetsInsightProps> = ({
  hostName,
  openDetailsPanel,
  'data-test-subj': dataTestSubj = ENDPOINT_ASSETS_INSIGHT_TEST_ID,
}) => {
  const { data: assetData, isLoading, error } = useEndpointAssetData(hostName);

  const handleOpenEndpointAssetsPanel = useCallback(() => {
    openDetailsPanel({ tab: EntityDetailsLeftPanelTab.ENDPOINT_ASSETS });
  }, [openDetailsPanel]);

  const hasAssetData = useMemo(() => {
    return !error && assetData && (assetData.endpoint?.posture || assetData.endpoint?.drift || assetData.endpoint?.privileges);
  }, [assetData, error]);

  const postureScore = assetData?.endpoint?.posture?.score;
  const postureLevel = assetData?.endpoint?.posture?.level;

  // Don't render if no asset data available
  if (!isLoading && !hasAssetData) {
    return null;
  }

  if (isLoading) {
    return (
      <EuiFlexItem data-test-subj={`${dataTestSubj}-loading`}>
        <EuiSkeletonText lines={1} />
      </EuiFlexItem>
    );
  }

  return (
    <InsightsSummaryRow
      icon={'storage'}
      text={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiLink onClick={handleOpenEndpointAssetsPanel} data-test-subj={`${dataTestSubj}-link`}>
              {ENDPOINT_ASSETS_TITLE}
            </EuiLink>
          </EuiFlexItem>
          {postureScore !== undefined && (
            <EuiFlexItem grow={false}>
              <EuiBadge color={getPostureLevelColor(postureLevel)}>
                {POSTURE_SCORE_LABEL}: {postureScore}
                {postureLevel ? ` (${postureLevel})` : ''}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      data-test-subj={dataTestSubj}
    />
  );
};

EndpointAssetsInsight.displayName = 'EndpointAssetsInsight';
