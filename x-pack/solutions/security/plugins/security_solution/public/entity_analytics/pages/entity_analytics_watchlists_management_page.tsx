/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { ENTITY_ANALYTICS_WATCHLISTS } from '../../app/translations';
import { HeaderPage } from '../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { WatchlistsFlyoutKey } from '../../flyout/entity_details/shared/constants';
import { Watchlists } from '../components/watchlists';
import { useSpaceId } from '../../common/hooks/use_space_id';

export const EntityAnalyticsWatchlistsManagementPage = () => {
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
      <SecuritySolutionPageWrapper data-test-subj="watchlistManagementPage">
        <HeaderPage
          title={ENTITY_ANALYTICS_WATCHLISTS}
          rightSideItems={[
            <EuiButton
              key="create-watchlist-button"
              iconType="plusInCircle"
              fill
              onClick={handleCreateClick}
            >
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.watchlistsManagement.createButtonLabel"
                defaultMessage="Create"
              />
            </EuiButton>,
          ]}
        />
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem>
            <Watchlists />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>
      <SpyRoute pageName={SecurityPageName.entityAnalyticsWatchlists} />
    </>
  );
};
