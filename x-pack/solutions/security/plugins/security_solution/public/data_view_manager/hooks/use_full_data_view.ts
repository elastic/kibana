/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { DataView, type DataViewSpec } from '@kbn/data-views-plugin/public';
import isEmpty from 'lodash/isEmpty';
import memoize from 'lodash/memoize';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';

import { useKibana } from '../../common/lib/kibana';
import { type DataViewManagerScopeName } from '../constants';
import { useDataView } from './use_data_view';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

/**
 * Creates a DataView from the provided DataViewSpec.
 *
 * This is a memoized function that will return the same DataView instance
 * for the same dataViewSpec version or title.
 */
const dataViewFromSpec: (
  fieldFormats: FieldFormatsStartCommon,
  dataViewSpec?: DataViewSpec
) => DataView | undefined = memoize(
  (fieldFormats: FieldFormatsStartCommon, dataViewSpec?: DataViewSpec) => {
    if (isEmpty(dataViewSpec?.fields)) {
      return undefined;
    }

    return new DataView({ spec: dataViewSpec, fieldFormats });
  },
  (...args) => {
    return args[1]?.version ?? args[1]?.title;
  }
);

/*
 * This hook should be used whenever we need the actual DataView and not just the spec for the
 * selected data view.
 */
export const useFullDataView = (
  dataViewManagerScope: DataViewManagerScopeName
): DataView | undefined => {
  const {
    services: { fieldFormats },
  } = useKibana();
  const { dataView: dataViewSpec } = useDataView(dataViewManagerScope);
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const dataView = useMemo(() => {
    if (newDataViewPickerEnabled) {
      return undefined;
    }

    dataViewFromSpec(fieldFormats, dataViewSpec);
  }, [dataViewSpec, fieldFormats, newDataViewPickerEnabled]);

  return dataView;
};
