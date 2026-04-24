/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { TableId } from '@kbn/securitysolution-data-table';
import { Header } from '../../flyout_v2/network_details/header';
import { Content } from '../../flyout_v2/network_details/content';
import { PreviewPanelFooter } from './footer';
import type { FlowTargetSourceDest } from '../../../common/search_strategy';
import { FlyoutNavigation } from '../shared/components/flyout_navigation';
import { FlyoutHeader } from '../shared/components/flyout_header';
import { FlyoutBody } from '../shared/components/flyout_body';

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
  isPreviewMode?: boolean;
}

/**
 * Panel to be displayed in the network details expandable flyout right section
 */
export const NetworkPanel: FC<NetworkPanelProps> = memo(
  ({ ip, flowTarget, scopeId, isPreviewMode }) => {
    return (
      <>
        <FlyoutNavigation
          flyoutIsExpandable={false}
          isPreviewMode={isPreviewMode}
          isRulePreview={scopeId === TableId.rulePreview}
        />
        <FlyoutHeader>
          <Header ip={ip} flowTarget={flowTarget} />
        </FlyoutHeader>
        <FlyoutBody>
          <Content ip={ip} flowTarget={flowTarget} />
        </FlyoutBody>
        {isPreviewMode && <PreviewPanelFooter ip={ip} flowTarget={flowTarget} scopeId={scopeId} />}
      </>
    );
  }
);

NetworkPanel.displayName = 'NetworkPanel';
