/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { Footer } from '../../flyout_v2/ioc/main/footer';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import type { Indicator } from '../../../common/threat_intelligence/types/indicator';

export interface IOCFlyoutFooterProps {
  /**
   * The document record for the IOC indicator.
   */
  hit: DataTableRecord;
  /**
   * A promise that resolves to the services required to render the IOC flyout footer.
   */
  servicesPromise: Promise<StartServices>;
  /**
   * A promise that resolves to a Security Solution redux store for flyout rendering.
   */
  storePromise: Promise<SecurityAppStore>;
}

export const IOCFlyoutFooter = ({ hit, servicesPromise, storePromise }: IOCFlyoutFooterProps) => {
  const [services, setServices] = useState<StartServices | null>(null);
  const [store, setStore] = useState<SecurityAppStore | null>(null);

  const indicator = useMemo<Indicator>(
    () => ({ _id: hit.raw._id, fields: hit.flattened as Indicator['fields'] }),
    [hit]
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
    children: <Footer indicator={indicator} />,
  });
};
