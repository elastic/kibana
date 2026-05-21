/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataSourcesCatalogFlyoutInitialView } from '@kbn/streams-app-plugin/public';
import type { ObservabilityOnboardingAppServices } from '../..';

export const OPEN_AWS_CATALOG_OVERVIEW_LOCATION_STATE = 'openAwsCatalogOverview';

interface CatalogFlyoutState {
  readonly isOpen: boolean;
  readonly initialView: DataSourcesCatalogFlyoutInitialView;
}

export function useDataSourcesCatalogFlyout() {
  const { streamsApp } = useKibana<ObservabilityOnboardingAppServices>().services;
  const DataSourcesCatalogFlyout = streamsApp?.DataSourcesCatalogFlyout;

  const [flyoutState, setFlyoutState] = useState<CatalogFlyoutState>({
    isOpen: false,
    initialView: 'browse',
  });

  const openCatalog = useCallback(
    (initialView: DataSourcesCatalogFlyoutInitialView = 'browse') => {
      if (!DataSourcesCatalogFlyout) {
        return false;
      }
      setFlyoutState({ isOpen: true, initialView });
      return true;
    },
    [DataSourcesCatalogFlyout]
  );

  const openAwsOverview = useCallback(() => openCatalog('aws-overview'), [openCatalog]);

  const closeCatalog = useCallback(() => {
    setFlyoutState((previous) => ({ ...previous, isOpen: false }));
  }, []);

  const catalogFlyout =
    flyoutState.isOpen && DataSourcesCatalogFlyout ? (
      <DataSourcesCatalogFlyout
        key={flyoutState.initialView}
        initialView={flyoutState.initialView}
        onClose={closeCatalog}
        onDataConnected={closeCatalog}
      />
    ) : null;

  return {
    canOpenCatalog: Boolean(DataSourcesCatalogFlyout),
    openCatalog,
    openAwsOverview,
    closeCatalog,
    catalogFlyout,
  };
}
