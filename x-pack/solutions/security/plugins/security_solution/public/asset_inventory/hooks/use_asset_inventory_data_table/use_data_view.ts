/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@tanstack/react-query';

export const useDataView = (indexPattern: string) => {
  const {
    data: { dataViews },
  } = useKibana().services;

  return useQuery(['useDataView', indexPattern], async () => {
    const [dataView] = await dataViews.find(indexPattern);

    if (!dataView) {
      throw new Error(`Data view not found [${indexPattern}]`);
    }

    return dataView;
  });
};
