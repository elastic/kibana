/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiSearchBarOnChangeArgs,
  EuiSuperUpdateButtonProps,
  OnTimeChangeProps,
} from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSearchBar, EuiSuperDatePicker } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';

import { getCommonTimeRanges } from '../../alert_selection/helpers/get_common_time_ranges';
import { StatusFilter } from './status_filter';

const updateButtonProps: EuiSuperUpdateButtonProps = {
  fill: false,
};

const DATE_PICKER_WIDTH = '345px';

const box = {
  incremental: true,
};

interface Props {
  end: string;
  isLoading?: boolean;
  onRefresh: () => void;
  onSearchChange: (search: string) => void;
  onStatusChange: (selectedStatuses: string[]) => void;
  onTimeChange: (start: string, end: string) => void;
  search: string;
  selectedStatuses: string[];
  start: string;
}

const SearchAndFilterComponent: React.FC<Props> = ({
  end,
  isLoading = false,
  onRefresh,
  onSearchChange,
  onStatusChange,
  onTimeChange,
  search,
  selectedStatuses,
  start,
}) => {
  const [unSubmittedQuery, setUnSubmittedQuery] = useState<string>(search);

  const commonlyUsedRanges = useMemo(() => getCommonTimeRanges(), []);

  const handleTimeChange = useCallback(
    ({ start: startDate, end: endDate }: OnTimeChangeProps) => {
      onSearchChange(unSubmittedQuery);
      onTimeChange(startDate, endDate);
    },
    [onSearchChange, onTimeChange, unSubmittedQuery]
  );

  const onChange = useCallback(({ queryText }: EuiSearchBarOnChangeArgs) => {
    setUnSubmittedQuery(queryText);
  }, []);

  const localOnRefresh = useCallback(() => {
    onSearchChange(unSubmittedQuery);
    onRefresh();
  }, [onRefresh, onSearchChange, unSubmittedQuery]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        localOnRefresh();
      }
    },
    [localOnRefresh]
  );

  return (
    <EuiFlexGroup
      alignItems="center"
      css={css`
        gap: 16px;
      `}
      gutterSize="none"
      wrap={true}
    >
      <EuiFlexItem grow={1}>
        <div data-test-subj="monitoringSearchAndFilterQuery" onKeyDown={onKeyDown}>
          <EuiSearchBar
            box={box}
            data-test-subj="monitoringSearchBar"
            defaultQuery={search}
            onChange={onChange}
          />
        </div>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <StatusFilter
          isLoading={isLoading}
          onStatusChange={onStatusChange}
          selectedStatuses={selectedStatuses}
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
          data-test-subj="monitoringDatePicker"
          end={end}
          isDisabled={isLoading}
          onRefresh={localOnRefresh}
          onTimeChange={handleTimeChange}
          showUpdateButton={true}
          start={start}
          updateButtonProps={updateButtonProps}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const SearchAndFilter = React.memo(SearchAndFilterComponent);
