/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { defaultToolsFlyoutProperties } from '../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { Footer } from '../../flyout_v2/document/footer';
import { documentFlyoutHistoryKey } from '../../flyout_v2/shared/constants/flyout_history';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import { NotesDetails } from '../../flyout_v2/notes';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';

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
  const history = useHistory();
  const [services, setServices] = useState<StartServices | null>(null);
  const [store, setStore] = useState<SecurityAppStore | null>(null);
  const isSecurityApp = useIsInSecurityApp();
  const historyKey = isSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;

  const openNotesFlyout = useCallback(() => {
    if (!services || !store) {
      return;
    }

    services.overlays?.openSystemFlyout(
      flyoutProviders({
        services,
        store,
        history,
        children: <NotesDetails hit={hit} />,
      }),
      {
        ...defaultToolsFlyoutProperties,
        historyKey,
      }
    );
  }, [history, historyKey, hit, services, store]);

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
