/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { EuiFieldSearch } from '@elastic/eui';
import { useLogsSearchUrlState } from '../../../hooks/use_logs_search_url_state';

const debounceIntervalInMs = 1000;

export const LogsSearchBar = () => {
  const [filterQuery, setFilterQuery] = useLogsSearchUrlState();
  const [searchText, setSearchText] = useState(filterQuery.query);

  const onQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  useDebounce(() => setFilterQuery({ ...filterQuery, query: searchText }), debounceIntervalInMs, [
    searchText,
  ]);

  return (
    <EuiFieldSearch
      data-test-subj="hostsView-logs-text-field-search"
      fullWidth
      isClearable
      placeholder={i18n.translate('xpack.infra.hostsViewPage.tabs.logs.textFieldPlaceholder', {
        defaultMessage: 'Search for log entries...',
      })}
      onChange={onQueryChange}
      value={searchText}
    />
  );
};
