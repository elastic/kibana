/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useRef } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '../../../common/lib/kibana';
import { getEntityStoreV2IndexPattern } from './constants';

export const useEntityStoreDataView = (spaceId: string | undefined) => {
  const {
    data: { dataViews },
  } = useKibana().services;

  const [dataView, setDataView] = useState<DataView | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const createdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!spaceId) return;

    const indexPattern = getEntityStoreV2IndexPattern(spaceId);

    if (createdRef.current === indexPattern) return;

    let cancelled = false;
    setIsLoading(true);
    setError(undefined);

    dataViews
      .create({
        title: indexPattern,
        name: 'Entity Analytics',
        timeFieldName: '@timestamp',
        allowNoIndex: true,
      })
      .then((dv) => {
        if (!cancelled) {
          createdRef.current = indexPattern;
          setDataView(dv);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [spaceId, dataViews]);

  return { dataView, isLoading, error };
};
