/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useMemo } from 'react';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { dataTableSelectors, tableDefaults } from '@kbn/securitysolution-data-table';
import type { BrowserFields } from '@kbn/timelines-plugin/common';
import type { PageScope } from '../../../data_view_manager/constants';
import { useLicense } from '../../../common/hooks/use_license';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { VIEW_SELECTION } from '../../../../common/constants';
import { getAllFieldsByName } from '../../../common/containers/source';
import type { AlertColumnHeaders } from './columns';
import { eventRenderedViewColumns, getColumns } from './columns';
import { useBrowserFields } from '../../../data_view_manager/hooks/use_browser_fields';

interface AlertTableCellContextProps {
  browserFields: BrowserFields;
  browserFieldsByName: Record<string, Partial<FieldSpec>>;
  columnHeaders: AlertColumnHeaders;
}

export const AlertTableCellContext = createContext<AlertTableCellContextProps | null>(null);

export const AlertTableCellContextProvider = ({
  tableId = '',
  sourcererScope,
  children,
}: {
  tableId?: string;
  sourcererScope: PageScope;
  children: React.ReactNode;
}) => {
  const browserFields = useBrowserFields(sourcererScope);
  const browserFieldsByName = useMemo(() => getAllFieldsByName(browserFields), [browserFields]);
  const license = useLicense();
  const gridColumns = useMemo(() => {
    return getColumns(license);
  }, [license]);
  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);
  const viewMode =
    useDeepEqualSelector((state) => (getTable(state, tableId ?? '') ?? tableDefaults).viewMode) ??
    tableDefaults.viewMode;
  const columnHeaders = useMemo(() => {
    return viewMode === VIEW_SELECTION.gridView ? gridColumns : eventRenderedViewColumns;
  }, [gridColumns, viewMode]);

  const cellValueContext = useMemo<AlertTableCellContextProps>(
    () => ({
      browserFields,
      browserFieldsByName,
      columnHeaders,
    }),
    [browserFields, browserFieldsByName, columnHeaders]
  );

  return (
    <AlertTableCellContext.Provider value={cellValueContext}>
      {children}
    </AlertTableCellContext.Provider>
  );
};
