/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { WatchlistsFlyoutKey } from '../../../flyout/entity_details/shared/constants';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { Watchlists } from '.';

export const WatchlistsTab: React.FC = () => {
  const { openFlyout } = useExpandableFlyoutApi();
  const spaceId = useSpaceId();

  const handleCreateClick = () => {
    openFlyout({
      right: {
        id: WatchlistsFlyoutKey,
        params: {
          mode: 'create',
          spaceId,
        },
      },
    });
  };

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="plusInCircle"
            fill
            onClick={handleCreateClick}
            data-test-subj="watchlistsTabCreateButton"
          >
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlists.tab.createButtonLabel"
              defaultMessage="Create watchlist"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <Watchlists />
    </>
  );
};
