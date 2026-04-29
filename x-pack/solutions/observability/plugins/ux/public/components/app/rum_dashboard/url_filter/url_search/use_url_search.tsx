/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useDebounce from 'react-use/lib/useDebounce';
import { useMemo, useState } from 'react';
import { useEsSearch } from '@kbn/observability-shared-plugin/public';
import { useUxQuery } from '../../hooks/use_ux_query';
import { useLegacyUrlParams } from '../../../../../context/url_params_context/use_url_params';
import { useDataView } from '../../local_uifilters/use_data_view';
import { urlSearchQuery } from '../../../../../services/data/url_search_query';

interface Props {
  popoverIsOpen: boolean;
  query: string;
}

export const useUrlSearch = ({ popoverIsOpen, query }: Props) => {
  const uxQuery = useUxQuery();

  const { uxUiFilters } = useLegacyUrlParams();

  const { transactionUrl, transactionUrlExcluded, ...restFilters } = uxUiFilters;

  const [searchValue, setSearchValue] = useState(query ?? '');

  useDebounce(
    () => {
      setSearchValue(query);
    },
    250,
    [query]
  );

  const { dataViewTitle } = useDataView();
  const { data: asyncSearchResult, loading } = useEsSearch(
    {
      // when `index` is undefined, the hook will not send a request,
      // so we pass this to ensure the search values load lazily
      index: uxQuery && popoverIsOpen ? dataViewTitle : undefined,
      ...urlSearchQuery(restFilters, uxQuery, searchValue),
    },
    [dataViewTitle, popoverIsOpen, uxQuery, searchValue],
    { name: 'UX_URL_SEARCH' }
  );

  const data = useMemo(() => {
    if (!asyncSearchResult) return asyncSearchResult;
    const { urls, totalUrls } = asyncSearchResult.aggregations ?? {};

    const pkey = Number(uxQuery?.percentile ?? 0).toFixed(1);

    return {
      total: totalUrls?.value || 0,
      items: (urls?.buckets ?? []).map((bucket) => ({
        url: bucket.key as string,
        count: bucket.doc_count,
        pld: bucket.medianPLD.values[pkey] ?? 0,
      })),
    };
  }, [asyncSearchResult, uxQuery?.percentile]);

  return { data, loading };
};
