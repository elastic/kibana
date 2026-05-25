/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLoadingElastic } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EntityAnalyticsPrivileges } from '../../../../common/api/entity_analytics';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { MissingPrivilegesCallout } from '../missing_privileges_callout';
import { WatchlistsManagementTable } from './components/watchlists_management_table';
interface WatchlistsProps {
  privileges?: EntityAnalyticsPrivileges;
  error?: { message: string } | null;
  isLoading: boolean;
  canRead: boolean;
  canWrite: boolean;
}

export const Watchlists = ({
  privileges,
  error,
  isLoading,
  canRead,
  canWrite,
}: WatchlistsProps) => {
  const spaceId = useSpaceId();

  return (
    <EuiFlexGroup direction="column">
      {error ? (
        <EuiFlexItem>
          <EuiCallOut
            announceOnMount={false}
            title={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.watchlists.privilegesError.title"
                defaultMessage="Error loading watchlists privileges"
              />
            }
            color="danger"
            iconType="cross"
          >
            <p>{error.message}</p>
          </EuiCallOut>
        </EuiFlexItem>
      ) : isLoading ? (
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingElastic size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : privileges && !canRead ? (
        <EuiFlexItem>
          <MissingPrivilegesCallout
            privileges={privileges}
            title={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.watchlists.missingPrivileges.title"
                defaultMessage="Insufficient privileges to view or manage Watchlists"
              />
            }
          />
        </EuiFlexItem>
      ) : (
        <EuiFlexItem>
          {spaceId && <WatchlistsManagementTable spaceId={spaceId} canWrite={canWrite} />}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
