/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef } from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { useGetUrlParams, useUrlParams } from '../../../hooks';

export function SearchField() {
  const { query } = useGetUrlParams();
  const [_, updateUrlParams] = useUrlParams();

  const [search, setSearch] = useState<undefined | string>(query ?? '');

  // Remember the last value this component wrote to the URL so we can tell
  // our own debounced writes apart from external updates (e.g. an Error
  // Insights card click that rewrites the `query` param). External updates
  // need to re-hydrate the input; our own writes do not.
  const lastWrittenQueryRef = useRef<string | undefined>(query);

  useDebounce(
    () => {
      if (search !== query) {
        lastWrittenQueryRef.current = search;
        updateUrlParams({ query: search });
      }
    },
    300,
    [search]
  );

  useEffect(() => {
    if (query !== lastWrittenQueryRef.current) {
      lastWrittenQueryRef.current = query;
      setSearch(query ?? '');
    }
  }, [query]);

  return (
    <EuiFieldSearch
      css={{ minWidth: 230 }}
      fullWidth
      placeholder={PLACEHOLDER_TEXT}
      value={search}
      onChange={(e) => {
        setSearch(e.target.value ?? '');
      }}
      isClearable={true}
      aria-label={PLACEHOLDER_TEXT}
      data-test-subj="syntheticsOverviewSearchInput"
    />
  );
}

const PLACEHOLDER_TEXT = i18n.translate('xpack.synthetics.monitorManagement.filter.placeholder', {
  defaultMessage: `Search by name, URL, host, tag, project or location`,
});
