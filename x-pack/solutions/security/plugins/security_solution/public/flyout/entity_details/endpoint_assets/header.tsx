/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiBadge,
  EuiSkeletonText,
} from '@elastic/eui';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { PlatformIcon } from '../../../management/components/endpoint_responder/components/header_info/platforms';
import { normalizePlatform, getPostureLevelColor } from './hooks/use_endpoint_asset_data';
import { TEST_IDS } from './constants';

const ENDPOINT_ASSETS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.title',
  { defaultMessage: 'Endpoint Assets' }
);

const LAST_SEEN_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.lastSeen',
  { defaultMessage: 'Last seen' }
);

interface EndpointAssetsHeaderProps {
  hostName: string;
  platform?: string;
  postureLevel?: string;
  postureScore?: number;
  lastSeen?: string;
  isLoading: boolean;
}

export const EndpointAssetsHeader: React.FC<EndpointAssetsHeaderProps> = React.memo(
  ({ hostName, platform, postureLevel, postureScore, lastSeen, isLoading }) => {
    const normalizedPlatform = useMemo(() => normalizePlatform(platform), [platform]);

    const formattedLastSeen = useMemo(() => {
      if (!lastSeen) return null;
      try {
        return new Date(lastSeen).toLocaleString();
      } catch {
        return lastSeen;
      }
    }, [lastSeen]);

    return (
      <FlyoutHeader data-test-subj={TEST_IDS.HEADER}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          {normalizedPlatform && (
            <EuiFlexItem grow={false}>
              <PlatformIcon platform={normalizedPlatform} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>{hostName}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{ENDPOINT_ASSETS_TITLE}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {isLoading ? (
          <EuiSkeletonText lines={1} />
        ) : (
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            {formattedLastSeen && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {LAST_SEEN_LABEL}: {formattedLastSeen}
                </EuiText>
              </EuiFlexItem>
            )}
            {postureScore !== undefined && (
              <EuiFlexItem grow={false}>
                <EuiBadge color={getPostureLevelColor(postureLevel)}>
                  {`Score: ${postureScore}${postureLevel ? ` (${postureLevel})` : ''}`}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
      </FlyoutHeader>
    );
  }
);

EndpointAssetsHeader.displayName = 'EndpointAssetsHeader';
