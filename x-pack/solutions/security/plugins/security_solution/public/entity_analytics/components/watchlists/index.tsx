/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { MissingPrivilegesCallout } from '../missing_privileges_callout';
import { WatchlistsManagementTable } from './components/watchlists_management_table';
import { useWatchlistsPrivileges } from '../../api/hooks/use_watchlists_privileges';

/**
 * TODO:
 * 1. useWatchlistsPrivileges hook to check for privileges and conditionally render the WatchlistsManagementTable or a callout indicating insufficient privileges
 * 2. Missing privileges callout component to indicate which privileges are missing if the user does not have sufficient privileges to view the WatchlistsManagementTable
 * 3. EuiCallOut to indicate errors loading data -- can you combine privmon and watchlists privileges into a single hook since they require many of the same privileges / display data?
 */

export const Watchlists = () => {
  const spaceId = useSpaceId();
  const { data: privileges } = useWatchlistsPrivileges();
  const hasRequiredPrivileges = privileges?.has_all_required ?? true;

  return (
    <EuiFlexGroup direction="column">
      {privileges && !hasRequiredPrivileges ? (
        <EuiFlexItem>
          <MissingPrivilegesCallout
            privileges={privileges}
            title={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.watchlists.missingPrivileges.title"
                defaultMessage="Insufficient privileges to view the watchlists management table"
              />
            }
          />
        </EuiFlexItem>
      ) : (
        <EuiFlexItem>{spaceId && <WatchlistsManagementTable spaceId={spaceId} />}</EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
