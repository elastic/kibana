/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { FILTER_NAMES } from './translations';
import { useScriptLibraryUrlParams } from '../script_library_url_params';

export const ScriptLibrarySearchTermFilter = memo(
  ({
    onChangeSearch,
    'data-test-subj': dataTestSubj,
  }: {
    onChangeSearch: (searchTerms: string[]) => void;
    'data-test-subj'?: string;
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { searchTerms, setUrlSearchTermsFilter } = useScriptLibraryUrlParams();
    const [searchValue, setSearchValue] = useState('');

    const onChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setSearchValue(value);

        if (!value) {
          onChangeSearch([]);
          setUrlSearchTermsFilter('');
        }
      },
      [setSearchValue, setUrlSearchTermsFilter, onChangeSearch]
    );

    const onSearch = useCallback(
      (value: string) => {
        if (!value) return;

        const termsList = value.split(',').reduce<string[]>((acc, curr) => {
          if (curr.trim() !== '') {
            acc.push(curr.trim());
          }
          return acc;
        }, []);
        onChangeSearch(termsList);
        setUrlSearchTermsFilter(termsList.join(','));
      },
      [onChangeSearch, setUrlSearchTermsFilter]
    );

    useEffect(() => {
      if (searchTerms && searchTerms.length > 0) {
        setSearchValue(searchTerms.join(','));
      }
    }, [setSearchValue, searchTerms]);

    return (
      <EuiFieldSearch
        data-test-subj={getTestId('search-terms-filter-search')}
        isClearable
        fullWidth
        placeholder={FILTER_NAMES.searchTerms}
        onChange={onChange}
        onSearch={onSearch}
        value={searchValue}
      />
    );
  }
);

ScriptLibrarySearchTermFilter.displayName = 'ScriptLibrarySearchTermFilter';
