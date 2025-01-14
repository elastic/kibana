/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlyoutHeader, EuiSkeletonText, EuiTitle, EuiToolTip } from '@elastic/eui';
import { BackToEndpointDetailsFlyoutSubHeader } from './back_to_endpoint_details_flyout_subheader';

interface EndpointDetailsFlyoutHeaderProps {
  children?: React.ReactNode | React.ReactNode[];
  endpointId?: string;
  hasBorder?: boolean;
  hostname?: string;
  isHostInfoLoading: boolean;
}

export const EndpointDetailsFlyoutHeader = memo<EndpointDetailsFlyoutHeaderProps>(
  ({ children, endpointId, hasBorder = false, hostname, isHostInfoLoading }) => {
    return (
      <EuiFlyoutHeader hasBorder={hasBorder}>
        {endpointId && <BackToEndpointDetailsFlyoutSubHeader endpointId={endpointId} />}

        {isHostInfoLoading ? (
          <EuiSkeletonText lines={1} />
        ) : (
          <EuiToolTip content={hostname} anchorClassName="eui-textTruncate">
            <EuiTitle size="s">
              <h2
                style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                data-test-subj="endpointDetailsFlyoutTitle"
              >
                {hostname}
              </h2>
            </EuiTitle>
          </EuiToolTip>
        )}
        {children}
      </EuiFlyoutHeader>
    );
  }
);

EndpointDetailsFlyoutHeader.displayName = 'EndpointDetailsFlyoutHeader';
