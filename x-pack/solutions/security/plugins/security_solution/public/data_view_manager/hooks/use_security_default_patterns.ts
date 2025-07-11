/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { sharedStateSelector } from '../redux/selectors';

interface UseSecurityDefaultPatternsResult {
  /**
   * The default data view id.
   */
  id: string;
  /**
   * The index patterns of the default data view.
   */
  indexPatterns: string[];
}

/**
 * Returns the default data view id and index patterns.
 */
export const useSecurityDefaultPatterns = (): UseSecurityDefaultPatternsResult => {
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
