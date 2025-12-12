/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import type { FlyoutPanelProps } from '@kbn/flyout';
import { i18n } from '@kbn/i18n';
import { NetworkPreviewBanner } from './components/preview_banner';
import { PreviewPanelFooter } from './footer';
import type { FlowTargetSourceDest } from '../../../common/search_strategy';
import { PanelHeader } from './header';
import { PanelContent } from './content';

export interface NetworkExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'network-details' | 'network-preview';
  params: NetworkPanelProps;
}

export const NetworkPanelKey: NetworkExpandableFlyoutProps['key'] = 'network-details';
export const NetworkPreviewPanelKey: NetworkExpandableFlyoutProps['key'] = 'network-preview';

export const NETWORK_PREVIEW_BANNER = {
  title: i18n.translate('xpack.securitySolution.flyout.right.network.networkPreviewTitle', {
    defaultMessage: 'Preview network details',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};

export interface NetworkPanelProps extends Record<string, unknown> {
  /**
   * IP value
   */
  ip: string;
  /**
   * Destination or source information
   */
  flowTarget: FlowTargetSourceDest;
  /**
   * Scope ID
   */
  scopeId: string;
  /**
   * If in preview mode, show preview banner and hide navigation
   */
  isChild?: boolean;
}

/**
 * Panel to be displayed in the network details expandable flyout right section
 */
export const NetworkPanel: FC<NetworkPanelProps> = memo(({ ip, flowTarget, scopeId, isChild }) => {
  return (
    <>
      {isChild && <NetworkPreviewBanner />}
      <PanelHeader ip={ip} flowTarget={flowTarget} />
      <PanelContent ip={ip} flowTarget={flowTarget} />
      {isChild && <PreviewPanelFooter ip={ip} flowTarget={flowTarget} scopeId={scopeId} />}
    </>
  );
});

NetworkPanel.displayName = 'NetworkPanel';
