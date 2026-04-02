/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import { Header } from '../../flyout_v2/document/header';
import { noopCellActionRenderer } from '../../flyout_v2/shared/components/cell_actions';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';

export interface AlertFlyoutHeaderProps extends Pick<DocViewRenderProps, 'hit'> {
  /**
   * The document record used to render the flyout header.
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
}

export const AlertFlyoutHeader = ({
  hit,
  servicesPromise,
  storePromise,
  onAlertUpdated,
}: AlertFlyoutHeaderProps) => {
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
      <Header
        hit={hit}
        renderCellActions={noopCellActionRenderer}
        onAlertUpdated={onAlertUpdated}
      />
    ),
  });
};
