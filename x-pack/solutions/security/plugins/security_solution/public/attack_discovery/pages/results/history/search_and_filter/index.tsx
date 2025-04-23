/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiSearchBarOnChangeArgs,
  EuiSelectableOption,
  EuiSuperUpdateButtonProps,
  OnTimeChangeProps,
} from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSearchBar,
  EuiSpacer,
  EuiSuperDatePicker,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { AIConnector } from '@kbn/elastic-assistant';
import type { DataView } from '@kbn/data-views-plugin/common';
import { uniq } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';

import { ConnectorFilter } from './connector_filter';
import { getCommonTimeRanges } from '../../../settings_flyout/alert_selection/helpers/get_common_time_ranges';
import { StatusFilter } from './status_filter';
import * as i18n from './translations';
import type { ConnectorFilterOptionData } from '../types';
import { VisibilityFilter } from './visibility_filter';

const updateButtonProps: EuiSuperUpdateButtonProps = {
  fill: false,
};

const DATE_PICKER_WIDTH = '345px';
export const MAX_ALERTS = 500;
export const MIN_ALERTS = 50;
export const STEP = 50;
export const NO_INDEX_PATTERNS: DataView[] = [];

const box = {
  incremental: true,
};

interface Props {
  aiConnectors: AIConnector[] | undefined;
  connectorFilterItems: Array<EuiSelectableOption<ConnectorFilterOptionData>>;
  connectorNames: string[] | undefined;
  end: string | undefined;
  filterByAlertIds: string[];
  isLoading?: boolean;
  onRefresh: () => void;
  query: string | undefined;
  setConnectorFilterItems: React.Dispatch<
    React.SetStateAction<Array<EuiSelectableOption<ConnectorFilterOptionData>>>
  >;
  setEnd: React.Dispatch<React.SetStateAction<string | undefined>>;
  setFilterByAlertIds: React.Dispatch<React.SetStateAction<string[]>>;
  setQuery: React.Dispatch<React.SetStateAction<string | undefined>>;
  setShared: React.Dispatch<React.SetStateAction<boolean | undefined>>;
  setStart: React.Dispatch<React.SetStateAction<string | undefined>>;
  setStatusItems: React.Dispatch<React.SetStateAction<EuiSelectableOption[]>>;
  /**
   * `undefined`: show both shared, and only visible to me Attack discoveries. `true`: show only shared Attack discoveries. `false`: show only visible to me Attack discoveries.
   */
  shared?: boolean;
  start: string | undefined;
  statusItems: EuiSelectableOption[];
}

const SearchAndFilterComponent: React.FC<Props> = ({
  aiConnectors,
  connectorFilterItems,
  connectorNames,
  end,
  filterByAlertIds,
  isLoading = false,
  onRefresh,
  query,
  setConnectorFilterItems,
  setEnd,
  setFilterByAlertIds,
  setQuery,
  setShared,
  setStart,
  setStatusItems,
  shared,
  start,
  statusItems,
}) => {
  const { euiTheme } = useEuiTheme();

  // Users accumulate an "unsubmitted" query as they type in the search bar,
  // but have not pressed the 'Enter' key to submit the query, (which would
  // call `onQuerySubmit`).
  //
  // This unsubmitted query is stored in `unSubmittedQuery`.
  //
  // To match the behavior of Discover, `setQuery` must be called with the
  // `unSubmittedQuery` query when:
  //
  // 1) The user selects a new time range
  // 2) The user clicks the refresh button
  //
  // Also to match the behavior of Discover, we must NOT call `setQuery` with
  // the `unSubmittedQuery` query when the user clicks the `Save` button.
  const [unSubmittedQuery, setUnSubmittedQuery] = React.useState<string | undefined>(query);

  // get the common time ranges for the date picker:
  const commonlyUsedRanges = useMemo(() => getCommonTimeRanges(), []);

  /**
   * `onTimeChange` is called by the `EuiSuperDatePicker` when the user:
   * 1) selects a new time range
   * 2) clicks the refresh button
   */
  const onTimeChange = useCallback(
    ({ start: startDate, end: endDate }: OnTimeChangeProps) => {
      setQuery(unSubmittedQuery);

      setStart(startDate);
      setEnd(endDate);
    },
    [setEnd, setQuery, setStart, unSubmittedQuery]
  );

  /**
   * `onChange` is called by the `SearchBar` as the user types in the search box
   */
  const onChange = useCallback(({ queryText }: EuiSearchBarOnChangeArgs) => {
    setUnSubmittedQuery(queryText);
  }, []);

  const uniqueFilterIds = useMemo(() => uniq(filterByAlertIds), [filterByAlertIds]);

  const localOnRefresh = useCallback(() => {
    setQuery(unSubmittedQuery);
    onRefresh();
  }, [onRefresh, setQuery, unSubmittedQuery]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        localOnRefresh();
      }
    },
    [localOnRefresh]
  );

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        css={css`
          gap: 16px;
        `}
        gutterSize="none"
        wrap={true}
      >
        <EuiFlexItem grow={1}>
          <div data-test-subj="searchAndFilterQueryQuery" onKeyDown={onKeyDown}>
            <EuiSearchBar
              box={box}
              data-test-subj="searchAndFilterSearchBar"
              defaultQuery={query}
              onChange={onChange}
            />
          </div>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <VisibilityFilter isLoading={isLoading} setShared={setShared} shared={shared} />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <StatusFilter
            isLoading={isLoading}
            setStatusItems={setStatusItems}
            statusItems={statusItems}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <ConnectorFilter
            aiConnectors={aiConnectors}
            connectorFilterItems={connectorFilterItems}
            connectorNames={connectorNames}
            isLoading={isLoading}
            setConnectorFilterItems={setConnectorFilterItems}
          />
        </EuiFlexItem>

        <EuiFlexItem
          css={css`
            width: ${DATE_PICKER_WIDTH};
          `}
          grow={false}
        >
          <EuiSuperDatePicker
            commonlyUsedRanges={commonlyUsedRanges}
            data-test-subj="alertSelectionDatePicker"
            end={end}
            isDisabled={isLoading}
            onRefresh={localOnRefresh}
            onTimeChange={onTimeChange}
            showUpdateButton={true}
            start={start}
            updateButtonProps={updateButtonProps}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {filterByAlertIds.length > 0 && (
        <>
          <EuiSpacer size="s" />

          <EuiFlexGroup
            css={css`
              gap: ${euiTheme.size.s};
            `}
            gutterSize="none"
            responsive={false}
            wrap={true}
          >
            {uniqueFilterIds.map((id) => (
              <EuiFlexItem key={id} grow={false}>
                <EuiBadge
                  css={css`
                    padding: ${euiTheme.size.s};
                  `}
                  color="hollow"
                  iconSide="right"
                  iconType="cross"
                  iconOnClick={() =>
                    setFilterByAlertIds((prev) => prev.filter((alertId) => alertId !== id))
                  }
                  iconOnClickAriaLabel={i18n.CLEAR_FILTER_ID(id)}
                >
                  {`_id: ${id}`}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};

export const SearchAndFilter = React.memo(SearchAndFilterComponent);
