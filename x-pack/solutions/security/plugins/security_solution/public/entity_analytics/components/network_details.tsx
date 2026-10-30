/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { FlowTargetSourceDest } from '../../../common/search_strategy/security_solution/network';
import { NetworkDetailsLink } from '../../common/components/links';
import { TruncatableText } from '../../common/components/truncatable_text';
import { getEmptyTagValue } from '../../common/components/empty_value';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';
import { FLYOUT_ORIGIN } from '../../common/lib/telemetry';

interface Props {
  ip: string | undefined | null;
}

const NetworkDetailsComponent: React.FC<Props> = ({ ip }) => {
  const { openNetworkFlyout } = useFlyoutApi();
  const openNetworkDetailsSidePanel = useCallback(() => {
    if (ip) {
      openNetworkFlyout({
        ip,
        flowTarget: FlowTargetSourceDest.source,
        origin: FLYOUT_ORIGIN.TABLE_FIELD_LINK,
      });
    }
  }, [ip, openNetworkFlyout]);

  if (!ip) {
    return getEmptyTagValue();
  }

  return (
    <NetworkDetailsLink ip={ip} onClick={openNetworkDetailsSidePanel}>
      <TruncatableText>{ip}</TruncatableText>
    </NetworkDetailsLink>
  );
};

export const NetworkDetails = React.memo(NetworkDetailsComponent);
NetworkDetails.displayName = 'NetworkDetails';
