/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { useKibana } from '../../common/lib/kibana';
import { sharedStateSelector } from '../redux/selectors';

/**
 * Returns the default security solution data view and alert data view
 */
export const useManagedDataViews = (): DataView[] => {
  const {
    dataViews: dataViewSpecs,
    defaultDataViewId,
    alertDataViewId,
  } = useSelector(sharedStateSelector);
  const {
    services: { fieldFormats },
  } = useKibana();

  return useMemo(
    () =>
      dataViewSpecs
        .filter((dv) => dv.id === defaultDataViewId || dv.id === alertDataViewId)
        .map((spec) => new DataView({ spec, fieldFormats })),
    [dataViewSpecs, defaultDataViewId, alertDataViewId, fieldFormats]
  );
};
