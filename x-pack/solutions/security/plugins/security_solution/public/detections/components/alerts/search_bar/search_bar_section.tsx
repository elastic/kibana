/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { SearchBarWithDataViewPicker } from '../../../../common/components/search_bar/search_bar_with_data_view_picker';
import { PageScope } from '../../../../data_view_manager/constants';

export const SEARCH_BAR_TEST_ID = 'alerts-page-search-bar';

export interface SearchBarSectionProps {
  /**
   * DataView object to pass to the SiemSearchBar component.
   */
  dataView: DataView;
}

/**
 * UI section of the alerts page that renders the data view picker next to the global search bar.
 */
export const SearchBarSection = memo(({ dataView }: SearchBarSectionProps) => {
  return (
    <SearchBarWithDataViewPicker
      dataTestSubj={SEARCH_BAR_TEST_ID}
      dataView={dataView}
      id={InputsModelId.global}
      scope={PageScope.alerts}
      // Alerts keeps the data view picker read-only, matching GlobalHeader.
      disabled
    />
  );
});

SearchBarSection.displayName = 'SearchBarSection';
