/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch } from '@elastic/eui';
import React, { useCallback } from 'react';

interface QueryRulesSetsSearchProps {
  searchKey: string;
  setSearchKey: React.Dispatch<React.SetStateAction<string>>;
}

export const QueryRulesSetsSearch: React.FC<QueryRulesSetsSearchProps> = ({
  searchKey,
  setSearchKey,
}) => {
  const onSearch = useCallback(
    (newSearch: string) => {
      const trimSearch = newSearch.trim();
      setSearchKey(trimSearch);
    },
    [setSearchKey]
  );

  return (
    <EuiFieldSearch
      aria-label="Search query rules sets"
      placeholder="Search"
      onChange={(e) => setSearchKey(e.target.value)}
      onSearch={onSearch}
      value={searchKey}
      data-test-subj="searchFieldQueryRulesSets"
    />
  );
};
