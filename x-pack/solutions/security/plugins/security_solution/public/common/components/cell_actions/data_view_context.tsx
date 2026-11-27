/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { PageScope } from '../../../data_view_manager/constants';

interface CellActionsDataViewContextValue {
  /** The data view manager scope the data view belongs to */
  scope: PageScope;
  /** A data view that is already loaded and ready to use */
  dataView: DataView;
}

const CellActionsDataViewContext = createContext<CellActionsDataViewContextValue | null>(null);

/**
 * Makes an already resolved data view available to the cell actions rendered below, so that each one of
 * them does not have to retrieve it again.
 *
 * Only provide a data view that is ready. When `dataView` is `undefined`, cell actions retrieve it themselves.
 */
export const CellActionsDataViewProvider = ({
  scope,
  dataView,
  children,
}: {
  scope: PageScope;
  dataView: DataView | undefined;
  children: React.ReactNode;
}) => {
  const value = useMemo<CellActionsDataViewContextValue | null>(
    () => (dataView ? { scope, dataView } : null),
    [scope, dataView]
  );

  return (
    <CellActionsDataViewContext.Provider value={value}>
      {children}
    </CellActionsDataViewContext.Provider>
  );
};

/**
 * Returns the provided data view only if it was provided for the requested scope.
 */
export const useCellActionsDataView = (scope: PageScope): DataView | undefined => {
  const context = useContext(CellActionsDataViewContext);
  return context?.scope === scope ? context.dataView : undefined;
};
