/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { Content } from '../../flyout_v2/ioc/content';
import type { CellActionRenderer } from '../../flyout_v2/shared/components/cell_actions';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { getTabsDisplayed } from '../../flyout_v2/ioc/tabs';
import type { Indicator } from '../../../common/threat_intelligence/types/indicator';
import { DiscoverCellActions } from '../cell_actions';

export interface IOCFlyoutOverviewTabProps {
  /**
   * The document record for the IOC indicator.
   */
  hit: DataTableRecord;
  /**
   * A promise that resolves to the services required to render the IOC flyout content.
   */
  servicesPromise: Promise<StartServices>;
  /**
   * A promise that resolves to a Security Solution redux store for flyout rendering.
   */
  storePromise: Promise<SecurityAppStore>;
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

export const IOCFlyoutOverviewTab = ({
  hit,
  servicesPromise,
  storePromise,
  columns,
  filter,
  onAddColumn,
  onRemoveColumn,
}: IOCFlyoutOverviewTabProps) => {
  const [services, setServices] = useState<StartServices | null>(null);
  const [store, setStore] = useState<SecurityAppStore | null>(null);

  const indicator = useMemo<Indicator>(
    () => ({ _id: hit.raw._id, fields: hit.flattened as Indicator['fields'] }),
    [hit]
  );

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

  const tabs = useMemo(
    () => getTabsDisplayed({ indicator, renderCellActions }),
    [indicator, renderCellActions]
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
      <div css={{ 'padding-top': '1em' }}>
        <Content tabs={tabs} selectedTabId={'overview'} />
      </div>
    ),
  });
};
