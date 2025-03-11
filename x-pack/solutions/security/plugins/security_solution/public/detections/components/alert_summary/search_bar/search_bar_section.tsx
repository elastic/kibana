/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Query, TimeRange } from '@kbn/es-query';
import { useDispatch } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';
import { SiemSearchBar } from '../../../../common/components/search_bar';
import { SourceFilterButton } from './sources_filter_button';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { inputsActions } from '../../../../common/store/inputs';
import { formatDate } from '../../../../common/components/super_date_picker';

const defaultQuery: Query = {
  language: 'kuery',
  query: '',
};
const defaultTimeRange = {
  from: 'now/d',
  to: 'now/d',
};

export interface SearchBarSectionProps {
  /**
   *
   */
  dataView: DataView;
  /**
   *
   */
  installedPackages: CustomIntegration[] | PackageListItem[];
  /**
   * TEMP: for demo purposes ONLY, toggles between old and unified components
   */
  showUnifiedComponents: boolean;
}

/**
 *
 */
export const SearchBarSection = memo(
  ({ dataView, installedPackages, showUnifiedComponents }: SearchBarSectionProps) => {
    const dispatch = useDispatch();
    const [dateRange, setDateRange] = useState<TimeRange>(defaultTimeRange);
    const [query, setQuery] = useState<Query>(defaultQuery);

    const onQuerySubmit = useCallback(
      (
        {
          dateRange: dr,
          query: qr,
        }: {
          dateRange: TimeRange;
          query?: Query | AggregateQuery | undefined;
        },
        isUpdate?: boolean
      ) => {
        setDateRange(dr);
        const { from, to } = dr;
        const isQuickSelection = from.includes('now') || to.includes('now');
        const absoluteFrom = formatDate(from);
        const absoluteTo = formatDate(to, { roundUp: true });
        if (isQuickSelection) {
          const actionPayload = {
            id: InputsModelId.global,
            fromStr: from,
            toStr: to,
            from: absoluteFrom,
            to: absoluteTo,
          };
          if (from === to) {
            dispatch(inputsActions.setAbsoluteRangeDatePicker(actionPayload));
          } else {
            dispatch(inputsActions.setRelativeRangeDatePicker(actionPayload));
          }
        } else {
          dispatch(
            inputsActions.setAbsoluteRangeDatePicker({
              id: InputsModelId.global,
              from: formatDate(from),
              to: formatDate(to),
            })
          );
        }

        if (qr != null) {
          setQuery(qr);
          dispatch(
            inputsActions.setFilterQuery({
              id: InputsModelId.global,
              ...qr,
            })
          );
        }
      },
      [dispatch]
    );

    const sources: EuiSelectableOption[] = useMemo(
      () =>
        installedPackages.map((relatedIntegration: PackageListItem) => ({
          label: relatedIntegration.title,
          checked: 'on',
        })),
      [installedPackages]
    );

    return (
      <>
        <EuiFlexGroup gutterSize="none" alignItems="center">
          <EuiFlexItem grow={false}>
            <SourceFilterButton sources={sources} />
          </EuiFlexItem>
          <EuiFlexItem>
            {showUnifiedComponents ? (
              <SearchBar
                dateRangeFrom={dateRange.from}
                dateRangeTo={dateRange.to}
                indexPatterns={[dataView]}
                onQuerySubmit={onQuerySubmit}
                query={query}
                showFilterBar={false}
                showQueryMenu={false}
              />
            ) : (
              <SiemSearchBar
                hideFilterBar
                hideQueryMenu
                id={InputsModelId.global}
                sourcererDataView={dataView.toSpec()}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);

SearchBarSection.displayName = 'SearchBarSection';
