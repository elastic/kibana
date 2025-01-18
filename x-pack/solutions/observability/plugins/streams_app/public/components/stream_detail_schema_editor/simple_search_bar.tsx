/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSearchBar, EuiSearchBarProps } from '@elastic/eui';
import React from 'react';

/* Simple search bar that doesn't attempt to integrate with unified search */
export const SimpleSearchBar = ({
  query,
  onChange,
}: {
  query: EuiSearchBarProps['query'];
  onChange: Required<EuiSearchBarProps>['onChange'];
}) => {
  return (
    <EuiSearchBar
      query={query}
      box={{
        incremental: true,
      }}
      onChange={(nextQuery) => {
        onChange(nextQuery);
      }}
    />
  );
};
