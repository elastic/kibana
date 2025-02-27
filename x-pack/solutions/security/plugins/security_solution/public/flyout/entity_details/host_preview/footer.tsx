/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FlyoutFooter } from '../../shared/components/flyout_footer';
import { HostPanelKey } from '../shared/constants';

export interface HostPreviewPanelFooterProps {
  contextID: string;
  scopeId: string;
  hostName: string;
}

export const HostPreviewPanelFooter = ({
  contextID,
  scopeId,
  hostName,
}: HostPreviewPanelFooterProps) => {
  const { openFlyout } = useExpandableFlyoutApi();

  const openHostFlyout = useCallback(() => {
    openFlyout({
      right: {
        id: HostPanelKey,
        params: {
          contextID,
          hostName,
          scopeId,
        },
      },
    });
  }, [openFlyout, hostName, contextID, scopeId]);

  return (
    <FlyoutFooter data-test-subj={'host-preview-footer'}>
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLink onClick={openHostFlyout} target="_blank" data-test-subj={'open-host-flyout'}>
            {i18n.translate('xpack.securitySolution.flyout.host.preview.viewDetailsLabel', {
              defaultMessage: 'Show full host details',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FlyoutFooter>
  );
};
