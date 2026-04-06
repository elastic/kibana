/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CreateWatchlistRequestBodyInput } from '../../../../common/api/entity_analytics/watchlists/management/create.gen';
import { IntegrationCards } from '../../../entity_analytics/components/entity_analytics_integrations_cards';
import { PRIVILEGED_USER_WATCHLIST_NAME } from '../../../../common/constants';

export interface ManagedWatchlistSourceInputProps {
  watchlist: CreateWatchlistRequestBodyInput;
}

export const ManagedWatchlistSourceInput = ({ watchlist }: ManagedWatchlistSourceInputProps) => {
  // Currently, Privileged User Monitoring is our only managed source that uses IntegrationCards.
  // In the future, this can be expanded into a switch statement or component map
  // when more managed source types are added.
  const isPrivilegedUserMonitoring = watchlist.name === PRIVILEGED_USER_WATCHLIST_NAME;

  return (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.watchlists.flyout.managedDataSourcesTitle"
                defaultMessage="Managed Data Sources"
              />
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.watchlists.flyout.managedDataSourcesDescription"
                defaultMessage="Data sources for {watchlistName}"
                values={{ watchlistName: watchlist.name }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth>
        {isPrivilegedUserMonitoring ? (
          <IntegrationCards
            maxCardWidth={360}
            showInstallationStatus
            titleSize="xs"
            isClickable={false}
          />
        ) : (
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlists.flyout.managedSourceNotSupported"
              defaultMessage="Managed source type not supported yet."
            />
          </EuiText>
        )}
      </EuiFormRow>
    </>
  );
};
