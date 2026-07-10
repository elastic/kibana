/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FlowTargetSourceDest } from '../../../common/search_strategy/security_solution/network';
import { NetworkDetailsLink } from '../../common/components/links';
import { TruncatableText } from '../../common/components/truncatable_text';
import { getEmptyTagValue } from '../../common/components/empty_value';
import { NetworkPanelKey } from '../../flyout/network_details';
import { useIsNewFlyoutEnabled } from '../../common/hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';

interface Props {
  ip: string | undefined | null;
}

const NetworkDetailsComponent: React.FC<Props> = ({ ip }) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const enableNewFlyout = useIsNewFlyoutEnabled();
  const { openNetworkFlyout } = useFlyoutApi();
  const openNetworkDetailsSidePanel = useCallback(() => {
    if (enableNewFlyout) {
      if (ip) {
        openNetworkFlyout({ ip, flowTarget: FlowTargetSourceDest.source });
      }
    } else {
      openFlyout({
        right: {
          id: NetworkPanelKey,
          params: {
            ip,
            flowTarget: FlowTargetSourceDest.source,
          },
        },
      });
    }
  }, [ip, openFlyout, enableNewFlyout, openNetworkFlyout]);

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
