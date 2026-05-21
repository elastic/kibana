/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { EuiSpacer } from '@elastic/eui';
import type { CellActionRenderer } from '../../flyout_v2/shared/components/cell_actions';
import { OverviewTab } from '../../flyout_v2/document/main/tabs/overview_tab';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { DataViewManagerBootstrap } from './data_view_manager_bootstrap';
import { DiscoverCellActions } from '../cell_actions';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';

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
  /**
   * Callback invoked after alert mutations to refresh the Discover table.
   */
  onAlertUpdated: () => void;
  /**
   * Current Discover columns shown in the doc viewer.
   */
  columns?: DocViewRenderProps['columns'];
  /**
   * Discover filter callback used by flyout cell actions.
   */
  filter?: DocViewRenderProps['filter'];
  /**
   * Callback used to add a column to the Discover table.
   */
  onAddColumn?: DocViewRenderProps['onAddColumn'];
  /**
   * Callback used to remove a column from the Discover table.
   */
  onRemoveColumn?: DocViewRenderProps['onRemoveColumn'];
}

export const AlertFlyoutOverviewTab = ({
  hit,
  servicesPromise,
  storePromise,
  onAlertUpdated,
  columns,
  filter,
  onAddColumn,
  onRemoveColumn,
}: AlertFlyoutOverviewTabProps) => {
  const [services, setServices] = useState<StartServices | null>(null);
  const [store, setStore] = useState<SecurityAppStore | null>(null);

  const renderCellActions = useCallback<CellActionRenderer>(
    (props) => (
      <DiscoverCellActions
        {...props}
        columns={columns}
        filter={filter}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
      />
    ),
    [columns, filter, onAddColumn, onRemoveColumn]
  );

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

  if (!services || !store) {
    return null;
  }

  return flyoutProviders({
    services,
    store,
    children: (
      <AlertFlyoutOverviewTabContent
        hit={hit}
        renderCellActions={renderCellActions}
        onAlertUpdated={onAlertUpdated}
      />
    ),
  });
};

interface AlertFlyoutOverviewTabContentProps {
  /**
   * The document record that will be used to render the content of the overview tab in the alert details flyout.
   */
  hit: DataTableRecord;
  /**
   * Callback passed to the flyout content to render cell actions
   */
  renderCellActions: CellActionRenderer;
  /**
   * Callback invoked after alert mutations to refresh the Discover table.
   */
  onAlertUpdated: () => void;
}

/**
 * The content of the overview tab in the alert details flyout. This is rendered inside the flyout providers to have access to the services and store.
 */
const AlertFlyoutOverviewTabContent = ({
  hit,
  renderCellActions,
  onAlertUpdated,
}: AlertFlyoutOverviewTabContentProps) => {
  const isInSecurityApp = useIsInSecurityApp();

  return (
    <>
      {!isInSecurityApp && <DataViewManagerBootstrap />}
      <EuiSpacer size="m" />
      <OverviewTab
        hit={hit}
        renderCellActions={renderCellActions}
        onAlertUpdated={onAlertUpdated}
      />
    </>
  );
};
