/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { SelectedDataView } from '../../../../sourcerer/store/model';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';
import { useBrowserFields } from '../../../../data_view_manager/hooks/use_browser_fields';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { RawIndicatorFieldId } from '../../../../../common/threat_intelligence/types/indicator';
import { DESCRIPTION } from './translations';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import type { BrowserFields } from '../../../types';

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
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const oldDataView = useSourcererDataView();
  const { dataView, status } = useDataView();

  const experimentalBrowserFields = useBrowserFields();
  const experimentalSelectedPatterns = useSelectedPatterns();

  const browserFields = useMemo(() => {
    const { threat = { fields: {} } } = newDataViewPickerEnabled
      ? experimentalBrowserFields
      : oldDataView.browserFields;

    return {
      ...(newDataViewPickerEnabled ? experimentalBrowserFields : oldDataView.browserFields),
      threat: {
        fields: {
          ...threat.fields,
          [indicatorNameField.name]: indicatorNameField,
        },
      },
    } as BrowserFields;
  }, [experimentalBrowserFields, newDataViewPickerEnabled, oldDataView.browserFields]);

  return useMemo(
    () =>
      ({
        ...(newDataViewPickerEnabled
          ? {
              sourcererDataView: {
                fields: dataView.fields.toSpec(),
                title: dataView.title,
                id: dataView.id,
              },
              loading: status !== 'ready',
              dataViewId: dataView.id,
              indicesExist: dataView.hasMatchedIndices(),
            }
          : oldDataView),
        browserFields,
        selectedPatterns: newDataViewPickerEnabled
          ? experimentalSelectedPatterns
          : oldDataView.selectedPatterns,
      } as SelectedDataView),
    [
      browserFields,
      dataView,
      experimentalSelectedPatterns,
      newDataViewPickerEnabled,
      oldDataView,
      status,
    ]
  );
};
