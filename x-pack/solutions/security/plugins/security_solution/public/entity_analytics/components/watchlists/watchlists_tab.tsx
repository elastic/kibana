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
import { useWatchlistsPrivileges } from '../../api/hooks/use_watchlists_privileges';
import { MissingPrivilegesCallout } from '../missing_privileges_callout';
import { Watchlists } from '.';

export const WatchlistsTab: React.FC = () => {
  const { openFlyout } = useExpandableFlyoutApi();
  const spaceId = useSpaceId();
  const { data: privileges, error, isLoading } = useWatchlistsPrivileges();
  const canRead = privileges?.has_read_permissions ?? false;
  const canWrite = privileges?.has_write_permissions ?? false;
  const hasAllRequired = privileges?.has_all_required ?? false;

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
            isDisabled={isLoading || !!error || !hasAllRequired}
            data-test-subj="watchlistsTabCreateButton"
          >
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlists.tab.createButtonLabel"
              defaultMessage="Create watchlist"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {privileges && canRead && !hasAllRequired && (
        <>
          <EuiSpacer size="m" />
          <MissingPrivilegesCallout
            privileges={privileges}
            title={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.watchlists.tab.missingPrivilegesCreateOrDelete.title"
                defaultMessage="Insufficient privileges to create or delete watchlists"
              />
            }
          />
        </>
      )}
      <EuiSpacer size="m" />
      <Watchlists
        privileges={privileges}
        error={error}
        isLoading={isLoading}
        canRead={canRead}
        canWrite={canWrite}
      />
    </>
  );
};
