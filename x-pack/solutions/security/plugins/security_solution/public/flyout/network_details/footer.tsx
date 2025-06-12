/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter, EuiLink, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { PREVIEW_FOOTER_LINK_TEST_ID, PREVIEW_FOOTER_TEST_ID } from './test_ids';
import type { FlowTargetSourceDest } from '../../../common/search_strategy';
import { NetworkPanelKey } from '.';

export interface PreviewPanelFooterProps {
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
}

/**
 * Footer at the bottom of preview panel with a link to open network details flyout
 */
export const PreviewPanelFooter: FC<PreviewPanelFooterProps> = ({ ip, flowTarget, scopeId }) => {
  const { openFlyout } = useExpandableFlyoutApi();

  const openNetworkFlyout = useCallback(() => {
    openFlyout({
      right: {
        id: NetworkPanelKey,
        params: {
          ip,
          flowTarget,
          scopeId,
        },
      },
    });
  }, [openFlyout, flowTarget, ip, scopeId]);

  const fullDetailsLink = useMemo(
    () => (
      <EuiLink
        onClick={openNetworkFlyout}
        target="_blank"
        data-test-subj={PREVIEW_FOOTER_LINK_TEST_ID}
      >
        <>
          {i18n.translate('xpack.securitySolution.flyout.network.preview.openFlyoutLabel', {
            defaultMessage: 'Show full network details',
          })}
        </>
      </EuiLink>
    ),
    [openNetworkFlyout]
  );

  return (
    <EuiFlyoutFooter data-test-subj={PREVIEW_FOOTER_TEST_ID}>
      <EuiPanel color="transparent">
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>{fullDetailsLink}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlyoutFooter>
  );
};
