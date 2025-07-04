/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFieldSearch } from '@elastic/eui';
import { debounce } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';

interface Props {
  value: string;
  onChange: (functionName: string) => void;
}

export function SearchFunctionsInput({ value, onChange }: Props) {
  const [searchQuery, setSearchQuery] = useState(value);
  const debouncedOnChange = useMemo(() => debounce(onChange, 300), [onChange]);
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      debouncedOnChange(e.target.value);
    },
    [debouncedOnChange]
  );
  return (
    <EuiFieldSearch
      data-test-subj="tableSearchInput"
      placeholder="Search functions by name"
      fullWidth={true}
      value={searchQuery}
      onChange={handleSearchChange}
    />
  );
}
