/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSyncStatus } from '../hooks/use_sync_status';

export const SyncStatusBanner = () => {
  const { loading, error, data } = useSyncStatus();

  if (loading) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.sdlcIntel.syncStatus.loading"
              defaultMessage="Checking SDLC sync status…"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return (
      <EuiCallOut
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.sdlcIntel.syncStatus.errorTitle"
            defaultMessage="Unable to load sync status"
          />
        }
        color="danger"
        iconType="error"
      >
        <p>{error}</p>
      </EuiCallOut>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiBadge color={data.healthy ? 'success' : 'warning'}>
          {data.healthy ? (
            <FormattedMessage id="xpack.sdlcIntel.syncStatus.healthy" defaultMessage="Sync healthy" />
          ) : (
            <FormattedMessage id="xpack.sdlcIntel.syncStatus.stale" defaultMessage="Sync stale or missing" />
          )}
        </EuiBadge>
      </EuiFlexItem>
      {data.lastSyncAt ? (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.sdlcIntel.syncStatus.lastSync"
              defaultMessage="Last sync: {lastSyncAt}"
              values={{ lastSyncAt: data.lastSyncAt }}
            />
          </EuiText>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.sdlcIntel.syncStatus.counts"
            defaultMessage="{epicCount} epics · {relationshipCount} relationships"
            values={{
              epicCount: data.epicPhaseCount,
              relationshipCount: data.relationshipCount,
            }}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
