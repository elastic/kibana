/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { FiltersGlobal } from '../../../../common/components/filters_global';
import { SiemSearchBar } from '../../../../common/components/search_bar';
import { useSignalHelpers } from '../../../../sourcerer/containers/use_signal_helpers';

export const SEARCH_BAR_TEST_ID = 'alerts-page-search-bar';

export interface SearchBarSectionProps {
  // TODO remove when we remove the newDataViewPickerEnabled feature flag
  /**
   * DataViewSpec object to pass as sourcererDataView to the SiemSearchBar component.
   */
  dataViewSpec: DataViewSpec;
}

/**
 * UI section of the alerts page that renders the global search bar.
 */
export const SearchBarSection = memo(({ dataViewSpec }: SearchBarSectionProps) => {
  const { pollForSignalIndex } = useSignalHelpers();

  return (
    <FiltersGlobal>
      <SiemSearchBar
        dataTestSubj={SEARCH_BAR_TEST_ID}
        id={InputsModelId.global}
        pollForSignalIndex={pollForSignalIndex}
        sourcererDataView={dataViewSpec} // TODO remove when we remove the newDataViewPickerEnabled feature flag
      />
    </FiltersGlobal>
  );
});

SearchBarSection.displayName = 'SearchBarSection';
