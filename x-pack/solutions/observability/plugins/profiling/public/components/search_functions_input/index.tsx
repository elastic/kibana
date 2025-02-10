/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFieldSearch } from '@elastic/eui';
import { debounce } from 'lodash';
import React, { useCallback, useState } from 'react';

interface Props {
  onChange: (functionName: string) => void;
}

export function SearchFunctionsInput({ onChange }: Props) {
  const [searchQuery, setSearchQuery] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setValueDebounced = useCallback(debounce(onChange, 300), [onChange]);

  return (
    <EuiFieldSearch
      data-test-subj="tableSearchInput"
      placeholder="Search functions by name"
      fullWidth={true}
      value={searchQuery}
      onChange={(e) => {
        setSearchQuery(e.target.value);
        setValueDebounced(e.target.value);
      }}
    />
  );
}
