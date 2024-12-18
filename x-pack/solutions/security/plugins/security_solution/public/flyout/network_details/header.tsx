/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import type { EuiFlyoutHeader } from '@elastic/eui';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { getNetworkDetailsUrl } from '../../common/components/link_to';
import { SecuritySolutionLinkAnchor } from '../../common/components/links';
import type { FlowTargetSourceDest } from '../../../common/search_strategy';
import { FlyoutHeader } from '../shared/components/flyout_header';
import { FlyoutTitle } from '../shared/components/flyout_title';
import { encodeIpv6 } from '../../common/lib/helpers';

export interface PanelHeaderProps extends React.ComponentProps<typeof EuiFlyoutHeader> {
  /**
   * IP value
   */
  ip: string;
  /**
   * Destination or source information
   */
  flowTarget: FlowTargetSourceDest;
}

/**
 *  Header component for the network details flyout
 */
export const PanelHeader: FC<PanelHeaderProps> = memo(
  ({ ip, flowTarget, ...flyoutHeaderProps }: PanelHeaderProps) => {
    const href = useMemo(
      () => getNetworkDetailsUrl(encodeURIComponent(encodeIpv6(ip)), flowTarget),
      [flowTarget, ip]
    );

    return (
      <FlyoutHeader {...flyoutHeaderProps}>
        <SecuritySolutionLinkAnchor
          deepLinkId={SecurityPageName.network}
          path={href}
          target={'_blank'}
          external={false}
        >
          <FlyoutTitle title={ip} iconType={'globe'} isLink />
        </SecuritySolutionLinkAnchor>
      </FlyoutHeader>
    );
  }
);

PanelHeader.displayName = 'PanelHeader';
