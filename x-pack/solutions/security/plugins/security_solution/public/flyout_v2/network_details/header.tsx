/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { getNetworkDetailsUrl } from '../../common/components/link_to';
import { SecuritySolutionLinkAnchor } from '../../common/components/links';
import type { FlowTargetSourceDest } from '../../../common/search_strategy';
import { FlyoutTitle } from '../shared/components/flyout_title';
import { encodeIpv6 } from '../../common/lib/helpers';

export interface HeaderProps {
  /**
   * IP value
   */
  ip: string;
  /**
   * Destination or source information
   */
  flowTarget: FlowTargetSourceDest;
}

const urlParamOverride = { timeline: { isOpen: false } };

/**
 * Header component for the network details flyout.
 */
export const Header: FC<HeaderProps> = memo(({ ip, flowTarget }: HeaderProps) => {
  const href = useMemo(() => getNetworkDetailsUrl(encodeIpv6(ip), flowTarget), [flowTarget, ip]);

  return (
    <SecuritySolutionLinkAnchor
      deepLinkId={SecurityPageName.network}
      path={href}
      target={'_blank'}
      external={false}
      override={urlParamOverride}
    >
      <FlyoutTitle
        title={ip}
        iconType={'globe'}
        isLink
        data-test-subj="network-details-flyout-header"
      />
    </SecuritySolutionLinkAnchor>
  );
});

Header.displayName = 'Header';
