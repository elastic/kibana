/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/css';
import type { TimeRange } from '@kbn/es-query';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';

const parentClassName = css`
  width: 100%;
`;

interface Props {
  dateRangeFrom?: string;
  dateRangeTo?: string;
  onQuerySubmit: (payload: { dateRange: TimeRange }, isUpdate?: boolean) => void;
  onRefresh?: Required<React.ComponentProps<typeof SearchBar>>['onRefresh'];
}

export function InvestigationSearchBar({
  dateRangeFrom,
  dateRangeTo,
  onQuerySubmit,
  onRefresh,
}: Props) {
  const {
    dependencies: {
      start: { unifiedSearch },
    },
  } = useKibana();

  return (
    <div className={parentClassName}>
      <unifiedSearch.ui.SearchBar
        appName="investigate"
        onQuerySubmit={({ dateRange }) => {
          onQuerySubmit({ dateRange });
        }}
        showQueryInput={false}
        showFilterBar={false}
        showQueryMenu={false}
        showDatePicker
        showSubmitButton={true}
        dateRangeFrom={dateRangeFrom}
        dateRangeTo={dateRangeTo}
        onRefresh={onRefresh}
        displayStyle="inPage"
        disableQueryLanguageSwitcher
      />
    </div>
  );
}
