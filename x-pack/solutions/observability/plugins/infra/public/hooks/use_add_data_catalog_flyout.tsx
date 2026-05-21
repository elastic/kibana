/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DataSourcesCatalogFlyoutInitialView } from '@kbn/streams-app-plugin/public';
import { useKibanaContextForPlugin } from './use_kibana';

interface CatalogFlyoutState {
  readonly isOpen: boolean;
  readonly initialView: DataSourcesCatalogFlyoutInitialView;
}

interface AddDataCatalogFlyoutContextValue {
  readonly useCatalogForAddData: boolean;
  readonly openCatalog: (initialView?: DataSourcesCatalogFlyoutInitialView) => void;
}

const AddDataCatalogFlyoutContext = createContext<AddDataCatalogFlyoutContextValue | null>(null);

export function AddDataCatalogFlyoutProvider({ children }: { children: React.ReactNode }) {
  const {
    services: { streamsApp },
  } = useKibanaContextForPlugin();
  const [flyoutState, setFlyoutState] = useState<CatalogFlyoutState>({
    isOpen: false,
    initialView: 'browse',
  });

  const DataSourcesCatalogFlyout = streamsApp.DataSourcesCatalogFlyout;

  const useCatalogForAddData = Boolean(DataSourcesCatalogFlyout);

  const openCatalog = useCallback(
    (initialView: DataSourcesCatalogFlyoutInitialView = 'browse') => {
      if (!DataSourcesCatalogFlyout) {
        return;
      }
      setFlyoutState({ isOpen: true, initialView });
    },
    [DataSourcesCatalogFlyout]
  );

  const closeCatalog = useCallback(() => {
    setFlyoutState((previous) => ({ ...previous, isOpen: false }));
  }, []);

  const contextValue = useMemo(
    () => ({
      useCatalogForAddData,
      openCatalog,
    }),
    [openCatalog, useCatalogForAddData]
  );

  const catalogModal =
    flyoutState.isOpen && DataSourcesCatalogFlyout
      ? createPortal(
          <DataSourcesCatalogFlyout
            key={flyoutState.initialView}
            initialView={flyoutState.initialView}
            onClose={closeCatalog}
            onDataConnected={closeCatalog}
          />,
          document.body
        )
      : null;

  return (
    <AddDataCatalogFlyoutContext.Provider value={contextValue}>
      {children}
      {catalogModal}
    </AddDataCatalogFlyoutContext.Provider>
  );
}

export function useAddDataCatalogFlyout(): AddDataCatalogFlyoutContextValue {
  const context = useContext(AddDataCatalogFlyoutContext);
  if (!context) {
    return {
      useCatalogForAddData: false,
      openCatalog: () => {},
    };
  }
  return context;
}
