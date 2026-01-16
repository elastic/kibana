/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { EndpointAssetsHeader } from './header';
import { EndpointAssetsContent } from './content';
import { useEndpointAssetData } from './hooks/use_endpoint_asset_data';
import type { EndpointAssetsPanelProps } from './types';
import { TEST_IDS } from './constants';

export { EndpointAssetsPanelKey, EndpointAssetsPreviewPanelKey } from './constants';
export type { EndpointAssetsPanelProps, EndpointAssetsPanelExpandableFlyoutProps } from './types';

/**
 * Endpoint Assets Panel - displays CAASM data for a host in the flyout
 *
 * This panel shows:
 * - Security posture score and controls
 * - Configuration drift events
 * - Privilege analysis (local admins)
 * - Unknown knowns (dormant risks)
 */
export const EndpointAssetsPanel: React.FC<EndpointAssetsPanelProps> = ({
  hostName,
  contextID,
  scopeId,
  isPreviewMode = false,
}) => {
  const { data: hostData, isLoading, error } = useEndpointAssetData(hostName);

  if (isLoading && !hostData) {
    return <FlyoutLoading />;
  }

  return (
    <div data-test-subj={TEST_IDS.PANEL}>
      <FlyoutNavigation
        flyoutIsExpandable={false}
        isPreviewMode={isPreviewMode}
      />
      <EndpointAssetsHeader
        hostName={hostName}
        platform={hostData?.host?.os?.platform}
        postureLevel={hostData?.endpoint?.posture?.level}
        postureScore={hostData?.endpoint?.posture?.score}
        lastSeen={hostData?.['@timestamp']}
        isLoading={isLoading}
      />
      <EndpointAssetsContent
        hostData={hostData}
        hostName={hostName}
        isLoading={isLoading}
        error={error}
        isPreviewMode={isPreviewMode}
      />
    </div>
  );
};

EndpointAssetsPanel.displayName = 'EndpointAssetsPanel';
