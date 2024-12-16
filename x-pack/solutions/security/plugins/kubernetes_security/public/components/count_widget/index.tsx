/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { useStyles } from './styles';
import type { IndexPattern, GlobalFilter } from '../../types';
import { addCommasToNumber } from '../../utils/add_commas_to_number';
import { addTimerangeAndDefaultFilterToQuery } from '../../utils/add_timerange_and_default_filter_to_query';
import { useFetchCountWidgetData } from './hooks';
import { addResourceTypeToFilterQuery, numberFormatter } from './helpers';
import { COUNT_WIDGET_KEY_PODS } from '../../../common/constants';

export const LOADING_TEST_ID = 'kubernetesSecurity:countWidgetLoading';
export const TOOLTIP_TEST_ID = 'kubernetesSecurity:countWidgetTooltip';
export const VALUE_TEST_ID = 'kubernetesSecurity:countWidgetValue';

export interface CountWidgetDeps {
  title: string;
  widgetKey: string;
  indexPattern?: IndexPattern;
  globalFilter: GlobalFilter;
  groupedBy: string;
}

export const CountWidget = ({
  title,
  widgetKey,
  indexPattern,
  globalFilter,
  groupedBy,
}: CountWidgetDeps) => {
  const styles = useStyles();

  const filterQueryWithTimeRange = useMemo(() => {
    let globalFilterModified = globalFilter.filterQuery;

    if (widgetKey === COUNT_WIDGET_KEY_PODS) {
      globalFilterModified = addResourceTypeToFilterQuery(globalFilter.filterQuery, 'pod');
    }
    return addTimerangeAndDefaultFilterToQuery(
      globalFilterModified,
      globalFilter.startDate,
      globalFilter.endDate
    );
  }, [globalFilter.filterQuery, globalFilter.startDate, globalFilter.endDate, widgetKey]);

  const { data, isLoading } = useFetchCountWidgetData(
    widgetKey,
    filterQueryWithTimeRange,
    groupedBy,
    indexPattern?.title
  );

  const countValue = useMemo((): number => {
    return data ? data?.pages[0] : 0;
  }, [data]);

  const formattedNumber = useMemo((): string => {
    return numberFormatter(countValue);
  }, [countValue]);

  return (
    <div css={styles.container}>
      <div css={styles.title}>{title}</div>
      <EuiToolTip
        content={isLoading ? null : addCommasToNumber(countValue)}
        data-test-subj={TOOLTIP_TEST_ID}
        aria-label="Info"
        position="top"
      >
        <EuiText css={styles.dataInfo} data-test-subj={VALUE_TEST_ID}>
          {isLoading ? (
            <EuiLoadingSpinner size="l" data-test-subj={LOADING_TEST_ID} />
          ) : (
            formattedNumber
          )}
        </EuiText>
      </EuiToolTip>
    </div>
  );
};
