/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { EuiDataGridColumnCellActionProps } from '@elastic/eui/src/components/datagrid/data_grid_types';
import { Indicator } from '../../../../../common/types/indicator';
import { AddToTimelineCellAction } from '../../../timeline/components/add_to_timeline';
import { FilterInCellAction } from '../../../query_bar/components/filter_in';
import { FilterOutCellAction } from '../../../query_bar/components/filter_out';
import { fieldAndValueValid, getIndicatorFieldAndValue } from '../../utils/field_value';
import type { Pagination } from '../../services/fetch_indicators';
import {
  FILTER_IN_BUTTON_TEST_ID,
  FILTER_OUT_BUTTON_TEST_ID,
  TIMELINE_BUTTON_TEST_ID,
} from './test_ids';

export interface CellActionsProps
  extends Omit<EuiDataGridColumnCellActionProps, 'colIndex' | 'isExpanded'> {
  /**
   * Array of {@link Indicator} to retrieve field and values for the cell actions.
   */
  indicators: Indicator[];
  /**
   *  Received from the IndicatorsTable to extract the correct {@link Indicator} from the array of indicators.
   */
  pagination: Pagination;
}

/**
 * Component used on an EuiDataGrid component (in our case for our IndicatorsTable component),
 * added to the cellActions property of an EuiDataGridColumn.
 * It displays the FilterIn, FilterOut and AddToTimeline icons in the popover
 * when the user hovers above a cell.
 */
export const CellActions: VFC<CellActionsProps> = ({
  rowIndex,
  columnId,
  Component,
  indicators,
  pagination,
}) => {
  const indicator = indicators[rowIndex % pagination.pageSize];
  const { key, value } = getIndicatorFieldAndValue(indicator, columnId);
  if (!fieldAndValueValid(key, value)) {
    return null;
  }

  return (
    <>
      <FilterInCellAction
        data={indicator}
        field={key}
        Component={Component}
        data-test-subj={FILTER_IN_BUTTON_TEST_ID}
      />
      <FilterOutCellAction
        data={indicator}
        field={key}
        Component={Component}
        data-test-subj={FILTER_OUT_BUTTON_TEST_ID}
      />
      <AddToTimelineCellAction
        data={indicator}
        field={key}
        Component={Component}
        data-test-subj={TIMELINE_BUTTON_TEST_ID}
      />
    </>
  );
};
