/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { getDataTypeIndices } from '../../../../utils/observability_data_views';
import type { AppDataType } from '../types';
import type { ExploratoryEmbeddableProps } from '../../../..';

export function useLocalDataView(
  seriesDataType: AppDataType,
  dataTypesIndexPatterns: ExploratoryEmbeddableProps['dataTypesIndexPatterns']
) {
  const [dataViewTitle, setDataViewTitle] = useLocalStorage(
    `${seriesDataType}AppDataViewTitle`,
    ''
  );

  const initDatViewTitle = dataTypesIndexPatterns?.[seriesDataType];

  const { data: updatedDataViewTitle } = useFetcher(async () => {
    if (initDatViewTitle) {
      return initDatViewTitle;
    }
    return (await getDataTypeIndices(seriesDataType)).indices;
  }, [initDatViewTitle, seriesDataType]);

  useEffect(() => {
    if (updatedDataViewTitle) {
      setDataViewTitle(updatedDataViewTitle);
    }
  }, [setDataViewTitle, updatedDataViewTitle]);

  // When the caller passes an explicit `dataTypesIndexPatterns`, prefer that
  // value over the localStorage cache. The cache is shared by all embeddables
  // of the same data type within a browser session, so without this precedence
  // a previously visited consumer (e.g. a CCS-prefixed `${remoteName}:synthetics-*`)
  // could leak its title into a freshly mounted embeddable on the next render.
  return { dataViewTitle: initDatViewTitle || dataViewTitle };
}
