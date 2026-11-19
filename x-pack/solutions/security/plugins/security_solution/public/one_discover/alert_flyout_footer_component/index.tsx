/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import React, { useEffect, useState } from 'react';
import { Footer } from '../../flyout_v2/document/main/footer';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { FLYOUT_ORIGIN } from '../../common/lib/telemetry';
import { useOpenNotesFlyout } from '../use_open_notes_flyout';

export interface AlertFlyoutFooterProps {
  /**
   * The document record used to render the flyout footer.
   */
  hit: DataTableRecord;
  /**
   * A promise that resolves to the services required to render the flyout footer.
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

export const AlertFlyoutFooter = ({
  hit,
  servicesPromise,
  storePromise,
  onAlertUpdated,
}: AlertFlyoutFooterProps) => {
  const [services, setServices] = useState<StartServices | null>(null);
  const [store, setStore] = useState<SecurityAppStore | null>(null);

  const openNotesFlyout = useOpenNotesFlyout({
    hit,
    services,
    store,
    origin: FLYOUT_ORIGIN.FOOTER_TAKE_ACTION,
  });

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
    children: <Footer hit={hit} onAlertUpdated={onAlertUpdated} onShowNotes={openNotesFlyout} />,
  });
};
