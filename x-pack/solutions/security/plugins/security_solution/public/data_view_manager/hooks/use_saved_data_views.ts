/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataViewListItem } from '@kbn/data-views-plugin/public';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { sharedStateSelector } from '../redux/selectors';

/**
 * Returns a list of saved data views
 * The list excludes managed data views (default security solution data view and alert data view)
 */
export const useSavedDataViews = (): DataViewListItem[] => {
  const {
    dataViews: dataViewSpecs,
    defaultDataViewId,
    alertDataViewId,
  } = useSelector(sharedStateSelector);

  return useMemo(
    () =>
      dataViewSpecs
        .filter((dv) => dv.id !== defaultDataViewId && dv.id !== alertDataViewId)
        .map((spec) => ({
          id: spec.id ?? '',
          title: spec.title ?? '',
          name: spec.name,
        })),
    [dataViewSpecs, defaultDataViewId, alertDataViewId]
  );
};
