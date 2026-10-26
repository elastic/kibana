/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { useKibana } from '../../../../common/lib/kibana';
import {
  INTEGRATION_BUTTON_TEST_ID,
  IntegrationFilterButton,
  INTEGRATIONS_LIST_TEST_ID,
} from './integrations_filter_button';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { RELATED_INTEGRATION } from '../../../constants';

jest.mock('../../../../common/lib/kibana');

const integrations: EuiSelectableOption[] = [
  {
    'data-test-subj': 'first',
    checked: 'on',
    key: 'firstKey',
    label: 'firstLabel',
  },
  {
    'data-test-subj': 'second',
    key: 'secondKey',
    label: 'secondLabel',
  },
];

const negatedFilter = (value: string): Filter => ({
  meta: {
    alias: null,
    disabled: false,
    index: undefined,
    key: RELATED_INTEGRATION,
    negate: true,
    params: { query: value },
    type: 'phrase',
  },
  query: { match_phrase: { [RELATED_INTEGRATION]: value } },
});

describe('<IntegrationFilterButton />', () => {
  it('should render the component', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: { data: { query: { filterManager: jest.fn() } } },
    });

    const { getByTestId } = render(<IntegrationFilterButton integrations={integrations} />);

    const button = getByTestId(INTEGRATION_BUTTON_TEST_ID);
    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    expect(getByTestId(INTEGRATIONS_LIST_TEST_ID)).toBeInTheDocument();
    expect(getByTestId('first')).toHaveTextContent('firstLabel');
    expect(getByTestId('second')).toHaveTextContent('secondLabel');
  });

  it('should add and remove the negated filter in filterManager', () => {
    let filters: Filter[] = [];
    const getFilters = jest.fn(() => filters);
    const setFilters = jest.fn((newFilters: Filter[]) => {
      filters = newFilters;
    });
    (useKibana as jest.Mock).mockReturnValue({
      services: { data: { query: { filterManager: { getFilters, setFilters } } } },
    });

    const { getByTestId } = render(<IntegrationFilterButton integrations={integrations} />);

    fireEvent.click(getByTestId(INTEGRATION_BUTTON_TEST_ID));

    // deselecting an integration negates the filter for its rule
    fireEvent.click(getByTestId('first'));
    expect(setFilters).toHaveBeenLastCalledWith([negatedFilter('firstKey')]);

    // selecting it back drops the negated filter
    fireEvent.click(getByTestId('first'));
    expect(setFilters).toHaveBeenLastCalledWith([]);
  });
});
