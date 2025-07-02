/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { sharedStateSelector } from '../redux/selectors';

export const useSecurityDefaultPatterns = (): { id: string; indexPatterns: string[] } => {
  const { dataViews: dataViewSpecs, defaultDataViewId } = useSelector(sharedStateSelector);

  const defaultDataViewSpec = useMemo(
    () => dataViewSpecs.find((dv) => dv.id === defaultDataViewId),
    [dataViewSpecs, defaultDataViewId]
  );

  return useMemo(
    () => ({
      id: defaultDataViewSpec?.id ?? '',
      indexPatterns: defaultDataViewSpec?.title?.split(',') ?? [],
    }),
    [defaultDataViewSpec]
  );
};
