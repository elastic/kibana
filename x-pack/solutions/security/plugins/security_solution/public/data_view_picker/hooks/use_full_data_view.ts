/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { DataView } from '@kbn/data-views-plugin/public';
import { useKibana } from '../../common/lib/kibana';
import { type DataViewPickerScopeName } from '../constants';
import { useDataView } from './use_data_view';

export interface UseGetScopedSourcererDataViewArgs {
  dataViewPickerScope: DataViewPickerScopeName;
}

/*
 *
 * returns the created dataView based on dataView spec
 * returned from useDataView
 *
 * */
export const useFullDataView = ({
  dataViewPickerScope,
}: UseGetScopedSourcererDataViewArgs): DataView | undefined => {
  const {
    services: { fieldFormats },
  } = useKibana();
  const { dataView: dataViewSpec } = useDataView(dataViewPickerScope);

  const dataView = useMemo(() => {
    if (Object.keys(dataViewSpec).length) {
      return new DataView({ spec: dataViewSpec, fieldFormats });
    } else {
      return undefined;
    }
  }, [dataViewSpec, fieldFormats]);

  return dataView;
};
