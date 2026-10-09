/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { BrowserFields as DataViewBrowserFields } from '@kbn/timelines-plugin/common';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';
import { useBrowserFields } from '../../../../data_view_manager/hooks/use_browser_fields';
import { RawIndicatorFieldId } from '../../../../../common/threat_intelligence/types/indicator';
import { DESCRIPTION } from './translations';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import type { BrowserFields } from '../../../types';

/**
 * Combined data from a Kibana data view and its selected patterns to create
 * selected data view state.
 */
export interface SelectedDataView {
  /**
   * @deprecated use EcsFlat or fields / indexFields from data view
   */
  browserFields: DataViewBrowserFields;
  dataViewId: string | null; // null if legacy pre-8.0 timeline
  /** do the selected indices exist */
  indicesExist: boolean;
  /** is an update being made to the data view */
  loading: boolean;
  /** all selected patterns */
  selectedPatterns: string[];
  /**
   * Easier to add this additional data rather than
   * try to extend the SelectedDataView type from DataView.
   */
  sourcererDataView: DataViewSpec;
}

/**
 * Inline definition for a runtime field "threat.indicator.name" we are adding for indicators grid
 */
const indicatorNameField = {
  aggregatable: true,
  name: RawIndicatorFieldId.Name,
  searchable: true,
  type: 'string',
  category: 'threat',
  description: DESCRIPTION,
  esTypes: ['keyword'],
} as const;

export const useTIDataView = (): SelectedDataView => {
  const { dataView, status } = useDataView();
  const browserFields = useBrowserFields(dataView);
  const selectedPatterns = useSelectedPatterns(dataView);

  const tiBrowserFields = useMemo(() => {
    const { threat = { fields: {} } } = browserFields;

    return {
      ...browserFields,
      threat: {
        fields: {
          ...threat.fields,
          [indicatorNameField.name]: indicatorNameField,
        },
      },
    } as BrowserFields;
  }, [browserFields]);

  return useMemo(
    () =>
      ({
        ...{
          sourcererDataView: {
            fields: dataView.fields.toSpec(),
            title: dataView.title,
            id: dataView.id,
          },
          loading: status !== 'ready',
          dataViewId: dataView.id,
          indicesExist: dataView.hasMatchedIndices(),
        },
        browserFields: tiBrowserFields,
        selectedPatterns,
      } as SelectedDataView),
    [tiBrowserFields, dataView, selectedPatterns, status]
  );
};
