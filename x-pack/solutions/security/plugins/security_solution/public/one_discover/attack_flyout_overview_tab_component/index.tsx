/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { EuiSpacer } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { CellActionRenderer } from '../../flyout_v2/shared/components/cell_actions';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { OverviewTab } from '../../flyout_v2/attack/main/tabs/overview_tab';
import { DataViewManagerBootstrap } from '../alert_flyout_overview_tab_component/data_view_manager_bootstrap';
import { DiscoverCellActions } from '../cell_actions';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';

export interface AttackFlyoutOverviewTabProps {
  hit: DataTableRecord;
  servicesPromise: Promise<StartServices>;
  storePromise: Promise<SecurityAppStore>;
  /** Callback invoked after attack mutations to refresh the Discover table. */
  onAttackUpdated: () => void;
  /** Current Discover columns shown in the doc viewer. */
  columns?: DocViewRenderProps['columns'];
  /** Discover filter callback used by flyout cell actions. */
  filter?: DocViewRenderProps['filter'];
  /** Callback used to add a column to the Discover table. */
  onAddColumn?: DocViewRenderProps['onAddColumn'];
  /** Callback used to remove a column from the Discover table. */
  onRemoveColumn?: DocViewRenderProps['onRemoveColumn'];
}

export const AttackFlyoutOverviewTab = ({
  hit,
  servicesPromise,
  storePromise,
  onAttackUpdated,
  columns,
  filter,
  onAddColumn,
  onRemoveColumn,
}: AttackFlyoutOverviewTabProps) => {
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

  if (!services || !store) {
    return null;
  }

  return flyoutProviders({
    services,
    store,
    children: (
      <AttackFlyoutOverviewTabContent
        hit={hit}
        renderCellActions={renderCellActions}
        onAttackUpdated={onAttackUpdated}
      />
    ),
  });
};

interface AttackFlyoutOverviewTabContentProps {
  hit: DataTableRecord;
  /** Callback passed to the flyout content to render cell actions. */
  renderCellActions: CellActionRenderer;
  /** Callback invoked after attack mutations to refresh the Discover table. */
  onAttackUpdated: () => void;
}

/**
 * Rendered inside flyoutProviders so it has access to Redux store and services.
 */
const AttackFlyoutOverviewTabContent = ({
  hit,
  renderCellActions,
  onAttackUpdated,
}: AttackFlyoutOverviewTabContentProps) => {
  const isInSecurityApp = useIsInSecurityApp();

  return (
    <>
      {!isInSecurityApp && <DataViewManagerBootstrap />}
      <EuiSpacer size="m" />
      <OverviewTab
        hit={hit}
        onAttackUpdated={onAttackUpdated}
        renderCellActions={renderCellActions}
      />
    </>
  );
};
