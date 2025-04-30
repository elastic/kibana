/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useMemo } from 'react';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { tableDefaults, dataTableSelectors } from '@kbn/securitysolution-data-table';
import type { BrowserFields } from '@kbn/timelines-plugin/common';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import type { SourcererScopeName } from '../../../sourcerer/store/model';
import { useLicense } from '../../../common/hooks/use_license';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { VIEW_SELECTION } from '../../../../common/constants';
import { getAllFieldsByName } from '../../../common/containers/source';
import { eventRenderedViewColumns, getColumns } from './columns';
import type { AlertColumnHeaders } from './columns';
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
  sourcererScope: SourcererScopeName;
  children: React.ReactNode;
}) => {
  const { browserFields: oldBrowserFields } = useSourcererDataView(sourcererScope);
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const experimentalBrowserFields = useBrowserFields(sourcererScope);

  const browserFields = newDataViewPickerEnabled ? experimentalBrowserFields : oldBrowserFields;

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
