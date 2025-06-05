/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { dataTableSelectors, tableDefaults, TableId } from '@kbn/securitysolution-data-table';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';
import { FiltersGlobal } from '../../../../common/components/filters_global';
import { SiemSearchBar } from '../../../../common/components/search_bar';
import { useGlobalFullScreen } from '../../../../common/containers/use_full_screen';
import { showGlobalFilters } from '../../../../timelines/components/timeline/helpers';
import { useSignalHelpers } from '../../../../sourcerer/containers/use_signal_helpers';

export interface SearchBarSectionProps {
  /**
   *
   */
  dataViewSpec: DataViewSpec;
}

export const SearchBarSection = memo(({ dataViewSpec }: SearchBarSectionProps) => {
  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);
  const graphEventId = useShallowEqualSelector(
    (state) => (getTable(state, TableId.alertsOnAlertsPage) ?? tableDefaults).graphEventId
  );

  const { globalFullScreen } = useGlobalFullScreen();
  const { pollForSignalIndex } = useSignalHelpers();

  return (
    <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId })}>
      <SiemSearchBar
        id={InputsModelId.global}
        pollForSignalIndex={pollForSignalIndex}
        sourcererDataView={dataViewSpec}
      />
    </FiltersGlobal>
  );
});

SearchBarSection.displayName = 'SearchBarSection';
