/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTR_URL_FULL } from '@kbn/observability-ui-semantic-conventions';
import { useFilterValues } from '../../series_editor/use_filter_values';
import { SeriesConfig, SeriesUrl } from '../../types';

interface Props {
  query?: string;
  seriesId: number;
  series: SeriesUrl;
  seriesConfig: SeriesConfig;
}
export const useUrlSearch = ({ series, query, seriesId, seriesConfig }: Props) => {
  const { values, loading } = useFilterValues(
    {
      series,
      seriesId,
      field: ATTR_URL_FULL,
      baseFilters: seriesConfig.baseFilters,
      label: seriesConfig.labels[ATTR_URL_FULL],
    },
    query
  );

  return { values, loading };
};
