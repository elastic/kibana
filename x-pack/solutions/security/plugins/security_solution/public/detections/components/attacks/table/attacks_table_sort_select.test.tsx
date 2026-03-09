/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AttacksTableSortSelect,
  ATTACKS_TABLE_SORT_SELECT_TEST_ID,
  ATTACKS_TABLE_SORT_SELECT_OPTIONS_TEST_ID,
  DEFAULT_ATTACKS_SORT,
} from './attacks_table_sort_select';
import type { GroupingSort } from '@kbn/grouping/src';
import * as i18n from './translations';

import { useKibana } from '../../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../../common/lib/telemetry';

jest.mock('../../../../common/lib/kibana');

describe('AttacksTableSortSelect', () => {
  const defaultSort: GroupingSort = DEFAULT_ATTACKS_SORT;
  const onChange = jest.fn();
  const reportEventMock = jest.fn();

  beforeEach(() => {
    onChange.mockClear();
    reportEventMock.mockClear();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        telemetry: {
          reportEvent: reportEventMock,
        },
      },
    });
  });

  it('renders correctly with default sort', () => {
    render(<AttacksTableSortSelect sort={defaultSort} onChange={onChange} />);

    expect(screen.getByText(`${i18n.SORT_BY}: ${i18n.MOST_RECENT}`)).toBeInTheDocument();
  });

  it('opens popover on click', () => {
    render(<AttacksTableSortSelect sort={defaultSort} onChange={onChange} />);

    const button = screen.getByTestId(ATTACKS_TABLE_SORT_SELECT_TEST_ID);
    fireEvent.click(button);

    expect(screen.getByTestId(ATTACKS_TABLE_SORT_SELECT_OPTIONS_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText(i18n.MOST_RECENT)).toBeInTheDocument();
    expect(screen.getByText(i18n.LEAST_RECENT)).toBeInTheDocument();
    expect(screen.getByText(i18n.MOST_ALERTS)).toBeInTheDocument();
    expect(screen.getByText(i18n.LEAST_ALERTS)).toBeInTheDocument();
  });

  it('calls onChange when an option is selected', () => {
    render(<AttacksTableSortSelect sort={defaultSort} onChange={onChange} />);

    const button = screen.getByTestId(ATTACKS_TABLE_SORT_SELECT_TEST_ID);
    fireEvent.click(button);

    const leastRecentOption = screen.getByText(i18n.LEAST_RECENT);
    fireEvent.click(leastRecentOption);

    expect(onChange).toHaveBeenCalledWith([{ latestTimestamp: { order: 'asc' } }]);
    expect(reportEventMock).toHaveBeenCalledWith(AttacksEventTypes.TableSortChanged, {
      field: 'latestTimestamp',
      direction: 'asc',
    });
  });

  it('displays correct label for non-default sort', () => {
    const sort: GroupingSort = [{ 'attackRelatedAlerts>_count': { order: 'desc' } }];
    render(<AttacksTableSortSelect sort={sort} onChange={onChange} />);

    expect(screen.getByText(`${i18n.SORT_BY}: ${i18n.MOST_ALERTS}`)).toBeInTheDocument();
  });
});
