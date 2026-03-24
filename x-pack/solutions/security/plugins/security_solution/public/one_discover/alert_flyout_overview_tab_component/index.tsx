/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useSelector } from 'react-redux';
import { OverviewTab } from '../../flyout_v2/document/tabs/overview_tab';
import type { SecurityAppStore, State } from '../../common/store/types';
import type { StartServices } from '../../types';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { useInitDataViewManager } from '../../data_view_manager/hooks/use_init_data_view_manager';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import type { ResolverCellActionRenderer } from '../../resolver/types';

const DataViewManagerBootstrap = () => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const initDataViewManager = useInitDataViewManager();
  const sharedStatus = useSelector((state: State) => state.dataViewManager.shared.status);

  useEffect(() => {
    if (!newDataViewPickerEnabled) {
      return;
    }

    if (sharedStatus === 'pristine' || sharedStatus === 'error') {
      initDataViewManager([]);
    }
  }, [initDataViewManager, newDataViewPickerEnabled, sharedStatus]);

  return null;
};

export interface AlertFlyoutOverviewTabProps {
  /**
   * The document record that will be used to render the content of the overview tab in the alert details flyout.
   */
  hit: DataTableRecord;
  /**
   * A promise that resolves to the services required to render the content of the overview tab in the alert details flyout.
   */
  servicesPromise: Promise<StartServices>;
  /**
   * A promise that resolves to a Security Solution redux store for flyout rendering.
   */
  storePromise: Promise<SecurityAppStore>;
}

export const AlertFlyoutOverviewTab = ({
  hit,
  servicesPromise,
  storePromise,
}: AlertFlyoutOverviewTabProps) => {
  const [services, setServices] = useState<StartServices | null>(null);
  const [store, setStore] = useState<SecurityAppStore | null>(null);

  useEffect(() => {
    let isCanceled = false;

    Promise.all([servicesPromise, storePromise])
      .then(([resolvedServices, resolvedStore]) => {
        if (isCanceled) {
          return;
        }

        setServices(resolvedServices);
        setStore(resolvedStore);
      })
      .catch(() => {
        if (!isCanceled) {
          setServices(null);
          setStore(null);
        }
      });

    return () => {
      isCanceled = true;
    };
  }, [servicesPromise, storePromise]);

  // For now we are not rendering any cell actions in the overview tab, but we need to provide a renderer to prevent errors in the resolver component.
  // We will eventually implement the Discover cell actions.
  const renderCellActions = useCallback<ResolverCellActionRenderer>(
    ({ children, field, scopeId, value }) => <>{children}</>,
    []
  );

  if (!services || !store) {
    return null;
  }

  return flyoutProviders({
    services,
    store,
    children: (
      <>
        <DataViewManagerBootstrap />
        <OverviewTab hit={hit} renderCellActions={renderCellActions} />
      </>
    ),
  });
};
