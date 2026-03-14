/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { UnifiedSearchBar } from '../../../../components/shared/unified_search_bar';
import { useWaffleTimeContext } from '../hooks/use_waffle_time';

export const SearchBar = () => {
  const { setDateRange } = useWaffleTimeContext();

  const handleQuerySubmit = useCallback(
    (payload: { dateRange: TimeRange }, isUpdate?: boolean) => {
      if (isUpdate === false) {
        setDateRange(payload.dateRange);
      }
    },
    [setDateRange]
  );

  return (
    <UnifiedSearchBar
      onQuerySubmit={handleQuerySubmit}
      showDatePicker
      showFilterBar
      showSubmitButton
      showQueryMenu
    />
  );
};
