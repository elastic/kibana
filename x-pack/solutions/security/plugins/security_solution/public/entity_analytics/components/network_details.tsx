/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useFlyoutApi } from '@kbn/flyout';
import { NetworkPanelKeyV2 } from '../../flyoutV2/network_details';
import { FlowTargetSourceDest } from '../../../common/search_strategy/security_solution/network';
import { NetworkDetailsLink } from '../../common/components/links';
import { TruncatableText } from '../../common/components/truncatable_text';
import { getEmptyTagValue } from '../../common/components/empty_value';
import { NetworkPanelKey } from '../../flyout/network_details';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

interface Props {
  ip: string | undefined | null;
}

const NetworkDetailsComponent: React.FC<Props> = ({ ip }) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const { openFlyout: openFlyoutV2 } = useFlyoutApi();
  const newFlyoutEnabled = useIsExperimentalFeatureEnabled('newFlyout');
  const openNetworkDetailsSidePanel = useCallback(() => {
    if (newFlyoutEnabled) {
      openFlyoutV2({
        main: {
          id: NetworkPanelKeyV2,
          params: {
            ip,
            flowTarget: FlowTargetSourceDest.source,
          },
        },
      });
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
  }, [ip, newFlyoutEnabled, openFlyout, openFlyoutV2]);

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
