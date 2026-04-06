/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import type { CreateWatchlistRequestBodyInput } from '../../../../common/api/entity_analytics/watchlists/management/create.gen';
import { IntegrationCards } from '../../../entity_analytics/components/entity_analytics_integrations_cards';
import { PRIVILEGED_USER_WATCHLIST_NAME } from '../../../../common/constants';

export interface ManagedWatchlistSourceInputProps {
  watchlist: CreateWatchlistRequestBodyInput;
}

export const ManagedWatchlistSourceInput = ({ watchlist }: ManagedWatchlistSourceInputProps) => {
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  // Currently, Privileged User Monitoring is our only managed source that uses IntegrationCards.
  // In the future, this can be expanded into a switch statement or component map
  // when more managed source types are added.
  const isPrivilegedUserMonitoring = watchlist.name === PRIVILEGED_USER_WATCHLIST_NAME;

  // eslint-disable-next-line no-console
  console.log('currentPath', currentPath);
  return (
    <EuiFormRow fullWidth>
      {isPrivilegedUserMonitoring ? (
        <IntegrationCards maxCardWidth={360} showInstallationStatus titleSize="xs" />
      ) : (
        <div>{'Managed source type not supported yet.'}</div>
      )}
    </EuiFormRow>
  );
};
